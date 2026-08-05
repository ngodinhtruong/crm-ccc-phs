import io
import re
import unicodedata
from datetime import datetime, timedelta, date
from django.db.models import Q, Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.ekyc.models import EkycRecord
from apps.ekyc.permissions import HasEkycPermission
from apps.ekyc.serializers import (
    EkycRecordSerializer,
    EkycRecordCreateUpdateSerializer,
)
from apps.customers.models import CustomerAccount, Customer, CustomerEmployeeAssignment


def _normalize_pic(value):
    """Normalize PIC values imported from Excel before classifying call type."""
    text = unicodedata.normalize("NFD", str(value or "").strip().casefold())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return " ".join(text.replace("đ", "d").split())


def _is_not_called_record(record):
    """PIC is the source of truth for the called/not-called classification."""
    normalized_pic = _normalize_pic(record.pic)
    return "khong goi" in normalized_pic


class EkycRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasEkycPermission]
    queryset = EkycRecord.objects.all()

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return EkycRecordCreateUpdateSerializer
        return EkycRecordSerializer

    def get_queryset(self):
        queryset = EkycRecord.objects.select_related(
            "customer", "customer_account", "created_by_user"
        ).all()

        params = self.request.query_params
        q = params.get("q")
        account_number = params.get("account_number")
        call_status = params.get("call_status")
        call_result = params.get("call_result")
        branch_name = params.get("branch_name")
        customer_name = params.get("customer_name")
        manager_name = params.get("manager_name")
        phone = params.get("phone")
        follow_count = params.get("follow_count")
        call_date_from = params.get("call_date_from")
        call_date_to = params.get("call_date_to")

        if q:
            queryset = queryset.filter(
                Q(account_number__icontains=q)
                | Q(customer_name__icontains=q)
                | Q(phone__icontains=q)
                | Q(branch_name__icontains=q)
                | Q(manager_name__icontains=q)
                | Q(note__icontains=q)
            )

        if account_number:
            queryset = queryset.filter(account_number__icontains=account_number)

        if customer_name:
            queryset = queryset.filter(customer_name__icontains=customer_name)

        if manager_name:
            queryset = queryset.filter(manager_name__icontains=manager_name)

        if phone:
            queryset = queryset.filter(phone__icontains=phone)

        if follow_count:
            try:
                queryset = queryset.filter(follow_count=int(follow_count))
            except ValueError:
                pass

        if call_status:
            queryset = queryset.filter(call_status=call_status)

        if call_result:
            queryset = queryset.filter(call_result=call_result)

        if branch_name:
            queryset = queryset.filter(branch_name__icontains=branch_name)

        if call_date_from:
            queryset = queryset.filter(call_date__gte=call_date_from)

        if call_date_to:
            queryset = queryset.filter(call_date__lte=call_date_to)

        return queryset.order_by("-call_date", "-id")

    def perform_create(self, serializer):
        serializer.save(created_by_user=self.request.user)

    @action(detail=False, methods=["get"], url_path="lookup-customer")
    def lookup_customer(self, request):
        """
        Tra cứu thông tin khách hàng dựa trên Số TK lưu kí (account_number)
        hoặc tìm kiếm gợi ý danh sách Số TK lưu kí.
        """
        account_number = request.query_params.get("account_number", "").strip().upper()
        q = request.query_params.get("q", "").strip().upper()

        if q and not account_number:
            account_number = q

        if not account_number:
            # Trả về danh sách 20 tài khoản gần nhất làm gợi ý dropdown
            accounts = (
                CustomerAccount.objects.select_related("customer", "customer__branch")
                .all()
                .order_by("-id")[:20]
            )
            results = []
            for acc in accounts:
                cust = acc.customer
                branch_name = cust.branch.branch_name if cust and cust.branch else ""
                manager_name = self._get_manager_name(cust)
                results.append(
                    {
                        "customer_id": cust.id if cust else None,
                        "customer_account_id": acc.id,
                        "account_number": acc.account_number,
                        "customer_name": cust.full_name if cust else "",
                        "branch_name": branch_name,
                        "manager_name": manager_name,
                        "phone": cust.phone if cust else "",
                    }
                )
            return Response(results)

        # Lọc danh sách tài khoản theo account_number (tìm khớp chính xác hoặc chứa)
        accounts_qs = CustomerAccount.objects.select_related(
            "customer", "customer__branch"
        ).filter(account_number__icontains=account_number)

        # Khớp chính xác ưu tiên lên đầu
        exact_acc = accounts_qs.filter(account_number__iexact=account_number).first()
        matched_acc = exact_acc or accounts_qs.first()

        if matched_acc:
            cust = matched_acc.customer
            branch_name = cust.branch.branch_name if cust and cust.branch else ""
            manager_name = self._get_manager_name(cust)
            data = {
                "found": True,
                "customer_id": cust.id if cust else None,
                "customer_account_id": matched_acc.id,
                "account_number": matched_acc.account_number,
                "customer_name": cust.full_name if cust else "",
                "branch_name": branch_name,
                "manager_name": manager_name,
                "phone": cust.phone if cust else "",
            }

            # Nếu gọi từ autocomplete, kèm thêm bối cảnh danh sách gợi ý
            suggestions = []
            for acc in accounts_qs[:10]:
                c = acc.customer
                suggestions.append(
                    {
                        "customer_id": c.id if c else None,
                        "customer_account_id": acc.id,
                        "account_number": acc.account_number,
                        "customer_name": c.full_name if c else "",
                        "branch_name": c.branch.branch_name if c and c.branch else "",
                        "manager_name": self._get_manager_name(c),
                        "phone": c.phone if c else "",
                    }
                )
            data["suggestions"] = suggestions
            return Response(data)

        # Thử tìm theo mã khách hàng hoặc tên khách hàng
        cust_match = Customer.objects.filter(
            Q(customer_code__iexact=account_number) | Q(full_name__icontains=account_number)
        ).first()
        if cust_match:
            branch_name = cust_match.branch.branch_name if cust_match.branch else ""
            acc = cust_match.accounts.first()
            return Response(
                {
                    "found": True,
                    "customer_id": cust_match.id,
                    "customer_account_id": acc.id if acc else None,
                    "account_number": acc.account_number if acc else account_number,
                    "customer_name": cust_match.full_name,
                    "branch_name": branch_name,
                    "manager_name": self._get_manager_name(cust_match),
                    "phone": cust_match.phone or "",
                }
            )

        return Response(
            {
                "found": False,
                "account_number": account_number,
                "message": "Không tìm thấy thông tin số TK lưu kí này trong hệ thống.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    def _get_manager_name(self, customer):
        if not customer:
            return ""
        assignment = (
            CustomerEmployeeAssignment.objects.filter(
                customer=customer, is_current=True
            )
            .select_related("employee")
            .order_by("-id")
            .first()
        )
        if assignment and assignment.employee:
            return assignment.employee.full_name
        return ""

    @action(detail=False, methods=["post"], url_path="import-excel")
    def import_excel(self, request):
        """
        Nhập dữ liệu eKYC từ file Excel.
        Đọc và clean data linh hoạt từ các cột trong file:
        - Số tài khoản (account_number)
        - Tên KH (customer_name)
        - Tên CN / Chi nhánh (branch_name)
        - Tên MG / Môi giới (manager_name)
        - SĐT KH (phone)
        - Ngày gọi (call_date - cho phép null nếu trống hoặc "Không gọi")
        - Số lần follow (follow_count - bóc tách số từ chuỗi như "Lần 2", "Lần 1")
        - Tình trạng (call_status - Nghe máy, Không nghe máy, Thuê bao/Số không tồn tại)
        - Câu 1: KH có gặp khó khăn khi sử dụng DV tại PHS? -> Kết quả cuộc gọi (call_result)
        """
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"detail": "Vui lòng đính kèm file Excel (.xlsx)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from openpyxl import load_workbook
        except ImportError:
            return Response(
                {"detail": "Hệ thống chưa cài thư viện openpyxl để xử lý file Excel."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            wb = load_workbook(filename=file_obj, data_only=True)
            ws = wb.active
        except Exception as e:
            return Response(
                {"detail": f"Lỗi đọc file Excel: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = list(ws.iter_rows(values_only=True))
        if not rows or len(rows) < 2:
            return Response(
                {"detail": "File Excel không có dữ liệu (cần ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        headers = [str(cell).strip() if cell is not None else "" for cell in rows[0]]

        # Map tên cột linh hoạt theo từng tiêu đề trong Excel
        col_map = {}
        for idx, h in enumerate(headers):
            h_clean = str(h).strip()
            h_lower = h_clean.lower()

            if "câu 1" in h_lower or "khó khăn" in h_lower or "sử dụng dv" in h_lower:
                col_map["call_result"] = idx
            elif "số tài khoản" in h_lower or "số tk" in h_lower or "hđ mở tk" in h_lower or "account" in h_lower:
                if "account_number" not in col_map or "tài khoản" in h_lower or "số tk" in h_lower:
                    col_map["account_number"] = idx
            elif "tên kh" in h_lower or "tên khách" in h_lower:
                col_map["customer_name"] = idx
            elif "tên cn" in h_lower or "chi nhánh" in h_lower:
                col_map["branch_name"] = idx
            elif "tên mg" in h_lower or "môi giới" in h_lower or "quản lý" in h_lower:
                col_map["manager_name"] = idx
            elif "sđt kh" in h_lower or "sđt" in h_lower or "điện thoại" in h_lower:
                col_map["phone"] = idx
            elif "ngày gọi" in h_lower:
                col_map["call_date"] = idx
            elif "số lần follow" in h_lower or "follow" in h_lower:
                col_map["follow_count"] = idx
            elif "tình trạng" in h_lower:
                col_map["call_status"] = idx
            elif "kết quả" in h_lower or "result" in h_lower:
                if "call_result" not in col_map:
                    col_map["call_result"] = idx
            elif "ghi chú" in h_lower or "note" in h_lower:
                col_map["note"] = idx
            elif "pic" in h_lower:
                col_map["pic"] = idx

        if "account_number" not in col_map:
            return Response(
                {"detail": "Không tìm thấy cột 'Số tài khoản' hoặc 'Số TK' trong file Excel."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        success_count = 0
        errors = []
        records_to_create = []

        for row_idx, row in enumerate(rows[1:], start=2):
            raw_acc = row[col_map["account_number"]] if col_map.get("account_number") is not None else None
            if raw_acc is None:
                continue

            acc_str = str(raw_acc).strip().upper()
            if not acc_str or acc_str in ["NONE", "NULL", "STT", "NO."]:
                continue

            # Đọc các giá trị chuỗi trực tiếp từ Excel nếu có
            excel_cust_name = str(row[col_map["customer_name"]]).strip() if col_map.get("customer_name") is not None and row[col_map["customer_name"]] is not None else ""
            excel_branch_name = str(row[col_map["branch_name"]]).strip() if col_map.get("branch_name") is not None and row[col_map["branch_name"]] is not None else ""
            excel_manager_name = str(row[col_map["manager_name"]]).strip() if col_map.get("manager_name") is not None and row[col_map["manager_name"]] is not None else ""
            excel_phone = str(row[col_map["phone"]]).strip() if col_map.get("phone") is not None and row[col_map["phone"]] is not None else ""

            # Bỏ từ 'không gọi' hay các giá trị placeholder chuỗi
            if excel_phone.lower() in ["không gọi", "none", "null", "—"]:
                excel_phone = ""

            # Ngày gọi (cho phép null)
            raw_date = row[col_map["call_date"]] if col_map.get("call_date") is not None else None
            call_date_val = None
            if raw_date is not None:
                if isinstance(raw_date, (datetime, date)):
                    call_date_val = raw_date.date() if isinstance(raw_date, datetime) else raw_date
                elif isinstance(raw_date, str):
                    clean_d_str = raw_date.strip()
                    if clean_d_str and clean_d_str.lower() not in ["không gọi", "none", "null", "", "—"]:
                        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%m/%d/%Y"):
                            try:
                                call_date_val = datetime.strptime(clean_d_str, fmt).date()
                                break
                            except ValueError:
                                pass

            # Số lần follow (bóc tách số)
            raw_follow = row[col_map["follow_count"]] if col_map.get("follow_count") is not None else None
            follow_val = 1
            if raw_follow is not None and str(raw_follow).strip():
                digits = re.findall(r'\d+', str(raw_follow))
                if digits:
                    follow_val = int(digits[0])

            # Tình trạng
            raw_status_val = str(row[col_map["call_status"]]).strip() if col_map.get("call_status") is not None and row[col_map["call_status"]] is not None else ""
            call_status_clean = None

            if raw_status_val and raw_status_val.lower() not in ["không gọi", "none", "null", "", "—"]:
                st_lower = raw_status_val.lower()
                if "thuê bao" in st_lower or "tồn tại" in st_lower:
                    call_status_clean = "Thuê bao không tồn tại"
                elif "không nghe" in st_lower:
                    call_status_clean = "Không nghe máy"
                elif "nghe máy" in st_lower or "nghe" in st_lower:
                    call_status_clean = "Nghe máy"
                else:
                    call_status_clean = raw_status_val

            # Kết quả cuộc gọi (Từ cột Câu 1...)
            raw_result_val = str(row[col_map["call_result"]]).strip() if col_map.get("call_result") is not None and row[col_map["call_result"]] is not None else ""
            call_result_clean = None

            if raw_result_val and raw_result_val.lower() not in ["none", "null", "", "—"]:
                res_lower = raw_result_val.lower()
                if "tắt máy" in res_lower or "ngang" in res_lower:
                    call_result_clean = "Khách hàng tắt máy ngang"
                elif "không bấm" in res_lower or res_lower in ["không", "không có", "khong"]:
                    call_result_clean = "KH không bấm phím"
                elif "bấm phím" in res_lower or "có" in res_lower:
                    call_result_clean = "Khách hàng bấm phím"
                else:
                    call_result_clean = raw_result_val

            # Ghi chú
            note_val = str(row[col_map["note"]]).strip() if col_map.get("note") is not None and row[col_map["note"]] is not None else ""

            # PIC (loại gọi: autocall, không gọi, ...)
            raw_pic = row[col_map["pic"]] if col_map.get("pic") is not None else None
            pic_val = None
            if raw_pic is not None:
                pic_str = str(raw_pic).strip()
                if pic_str and pic_str.lower() not in ["none", "null", "", "—"]:
                    pic_val = pic_str

            # Tra cứu thông tin Khách hàng nếu trong Excel trống
            cust_acc = CustomerAccount.objects.select_related("customer", "customer__branch").filter(account_number__iexact=acc_str).first()
            cust = cust_acc.customer if cust_acc else None
            if not cust:
                cust = Customer.objects.filter(customer_code__iexact=acc_str).first()

            final_cust_name = excel_cust_name or (cust.full_name if cust else "")
            final_branch_name = excel_branch_name or (cust.branch.branch_name if cust and cust.branch else "")
            final_manager_name = excel_manager_name or self._get_manager_name(cust)
            final_phone = excel_phone or (cust.phone if cust else "")

            record = EkycRecord(
                customer=cust,
                customer_account=cust_acc,
                account_number=acc_str,
                customer_name=final_cust_name,
                branch_name=final_branch_name,
                manager_name=final_manager_name,
                phone=final_phone,
                call_date=call_date_val,
                follow_count=follow_val,
                call_status=call_status_clean,
                call_result=call_result_clean,
                note=note_val,
                pic=pic_val,
                created_by_user=request.user,
            )
            records_to_create.append(record)

        if records_to_create:
            EkycRecord.objects.bulk_create(records_to_create)
            success_count = len(records_to_create)

        return Response(
            {
                "message": f"Import thành công {success_count} bản ghi eKYC.",
                "success_count": success_count,
                "error_count": len(errors),
                "errors": errors,
            }
        )

    @action(detail=False, methods=["get"], url_path="download-template")
    def download_template(self, request):
        """
        Xuất file mẫu Excel để nhập eKYC.
        """
        try:
            from openpyxl import Workbook
        except ImportError:
            return Response({"detail": "Hệ thống chưa cài openpyxl."}, status=500)

        wb = Workbook()
        ws = wb.active
        ws.title = "Sample_eKYC_Import"

        headers = [
            "Số TK lưu kí",
            "Ngày gọi (YYYY-MM-DD)",
            "Số lần follow",
            "Tình trạng (Nghe máy / Không nghe máy / Thuê bao không tồn tại)",
            "Kết quả cuộc gọi (Khách hàng tắt máy ngang / KH không bấm phím / Khách hàng bấm phím)",
            "Ghi chú",
        ]
        ws.append(headers)

        # Mẫu 2 dòng
        today_str = timezone.now().strftime("%Y-%m-%d")
        ws.append(["054C123456", today_str, 1, "Nghe máy", "Khách hàng bấm phím", "Xác thực eKYC thành công"])
        ws.append(["054C654321", today_str, 2, "Không nghe máy", "KH không bấm phím", "Đã gọi lần 2"])

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="eKYC_Import_Template.xlsx"'
        return response

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """
        Trả về dữ liệu thống kê Dashboard eKYC với mặc định 5 tháng gần nhất,
        hỗ trợ các kỳ (MONTH, QUARTER, YEAR) và chế độ so sánh (YOY, QOQ).
        """
        granularity = request.query_params.get("granularity", "MONTH").upper()
        compare_mode = request.query_params.get("compare_mode", "NONE").upper()

        today = timezone.now().date()

        # Mặc định thời gian là 5 tháng gần nhất nếu không truyền call_date_from
        call_date_from_str = request.query_params.get("call_date_from")
        call_date_to_str = request.query_params.get("call_date_to")

        if call_date_from_str:
            try:
                start_date = datetime.strptime(call_date_from_str, "%Y-%m-%d").date()
            except ValueError:
                start_date = today - timedelta(days=150)
        else:
            # 5 tháng gần nhất (~150 ngày)
            start_date = today - timedelta(days=150)

        if call_date_to_str:
            try:
                end_date = datetime.strptime(call_date_to_str, "%Y-%m-%d").date()
            except ValueError:
                end_date = today
        else:
            end_date = today

        # Không dùng get_queryset() ở đây vì nó áp call_date_from/to trước và
        # làm mất các bản ghi "Không gọi" có call_date NULL.
        queryset = EkycRecord.objects.select_related(
            "customer", "customer_account", "created_by_user"
        ).filter(
            Q(call_date__gte=start_date, call_date__lte=end_date) | Q(call_date__isnull=True)
        )
        total_records = queryset.count()

        # Thống kê theo Tình trạng
        status_counts_raw = (
            queryset.values("call_status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        status_dict = {item["call_status"]: item["count"] for item in status_counts_raw}
        status_data = [
            {"status": "Nghe máy", "count": status_dict.get("Nghe máy", 0)},
            {"status": "Không nghe máy", "count": status_dict.get("Không nghe máy", 0)},
            {"status": "Thuê bao không tồn tại", "count": status_dict.get("Thuê bao không tồn tại", 0)},
        ]

        # Thống kê theo Kết quả cuộc gọi
        result_counts_raw = (
            queryset.values("call_result")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        result_dict = {item["call_result"]: item["count"] for item in result_counts_raw}
        result_data = [
            {"result": "Khách hàng tắt máy ngang", "count": result_dict.get("Khách hàng tắt máy ngang", 0)},
            {"result": "KH không bấm phím", "count": result_dict.get("KH không bấm phím", 0)},
            {"result": "Khách hàng bấm phím", "count": result_dict.get("Khách hàng bấm phím", 0)},
        ]

        # Nhóm xu hướng theo kỳ (MONTH, QUARTER, YEAR), kèm breakdown theo tình trạng & kết quả
        def get_period_label(d):
            if not d:
                return None
            if granularity == "YEAR":
                return d.strftime("%Y")
            elif granularity == "QUARTER":
                quarter = (d.month - 1) // 3 + 1
                return f"Q{quarter}/{d.year}"
            else:
                return d.strftime("%m/%Y")

        trend_map = {}        # period -> total count
        period_sort_map = {}  # period -> representative date for chronological order
        status_trend = {}     # period -> {status -> count}
        result_trend = {}     # period -> {result -> count}
        not_called_map = {}   # period -> count of "không gọi" records

        for rec in queryset.order_by("call_date", "created_at"):
            # PIC trong DB là nguồn xác định "gọi/không gọi". call_date chỉ
            # được dùng cho dữ liệu cũ chưa có PIC.
            is_not_called = _is_not_called_record(rec)

            # Chọn nhãn kỳ:
            # - Có call_date -> dùng call_date
            # - Không có call_date -> dùng created_at
            # - Dữ liệu import cũ có thể thiếu cả hai ngày; các bản ghi này vẫn
            #   thuộc tập dữ liệu của bộ lọc và được gom vào kỳ cuối đang xem.
            if rec.call_date:
                effective_date = rec.call_date
            else:
                effective_date = rec.created_at.date() if rec.created_at else end_date
            label = get_period_label(effective_date)

            if not label:
                continue

            trend_map[label] = trend_map.get(label, 0) + 1
            if label not in period_sort_map or effective_date < period_sort_map[label]:
                period_sort_map[label] = effective_date

            if label not in status_trend:
                status_trend[label] = {}
            st = rec.call_status or "__not_called__"
            status_trend[label][st] = status_trend[label].get(st, 0) + 1

            if label not in result_trend:
                result_trend[label] = {}
            rs = rec.call_result or "Không xác định"
            result_trend[label][rs] = result_trend[label].get(rs, 0) + 1

            # Đếm riêng số "không gọi"
            if is_not_called:
                not_called_map[label] = not_called_map.get(label, 0) + 1

        daily_trends = [{
            "date": k,
            "count": v,
            # Tổng số lượng khảo sát: gọi (có call_date) vs không gọi (null call_date)
            "called": v - not_called_map.get(k, 0),
            "not_called": not_called_map.get(k, 0),
            # Kết quả CS gọi khảo sát
            "lien_he_thanh_cong": status_trend.get(k, {}).get("Nghe máy", 0),
            "khong_lien_he_duoc": status_trend.get(k, {}).get("Không nghe máy", 0)
                                + status_trend.get(k, {}).get("Thuê bao không tồn tại", 0),
            "khac_lien_he": status_trend.get(k, {}).get("Không xác định", 0),
            # Kết quả kết nối (status breakdown)
            "ket_noi_thanh_cong": status_trend.get(k, {}).get("Nghe máy", 0),
            "khong_ket_noi_duoc": status_trend.get(k, {}).get("Không nghe máy", 0)
                                + status_trend.get(k, {}).get("Thuê bao không tồn tại", 0),
            # Kết quả KH phản hồi (result breakdown)
            "bam_phim": result_trend.get(k, {}).get("Khách hàng bấm phím", 0),
            "khong_bam_phim": result_trend.get(k, {}).get("KH không bấm phím", 0),
            "tat_may_ngang": result_trend.get(k, {}).get("Khách hàng tắt máy ngang", 0),
            "khong_ket_noi_result": result_trend.get(k, {}).get("Không xác định", 0),
        } for k, v in sorted(
            trend_map.items(), key=lambda item: period_sort_map[item[0]]
        )]

        # Dữ liệu so sánh cùng kỳ (YOY) hoặc kỳ liền trước (QOQ)
        comparison_info = None
        if compare_mode in ["YOY", "QOQ"]:
            days_span = (end_date - start_date).days or 1
            if compare_mode == "YOY":
                try:
                    prev_start = start_date.replace(year=start_date.year - 1)
                    prev_end = end_date.replace(year=end_date.year - 1)
                except ValueError:
                    prev_start = start_date - timedelta(days=365)
                    prev_end = end_date - timedelta(days=365)
            else:  # QOQ
                prev_end = start_date - timedelta(days=1)
                prev_start = prev_end - timedelta(days=days_span)

            prev_qs = self.get_queryset().filter(call_date__gte=prev_start, call_date__lte=prev_end)
            prev_total = prev_qs.count()
            prev_answered = prev_qs.filter(call_status="Nghe máy").count()
            prev_key_pressed = prev_qs.filter(call_result="Khách hàng bấm phím").count()

            current_answered = status_dict.get("Nghe máy", 0)
            current_key_pressed = result_dict.get("Khách hàng bấm phím", 0)

            total_diff = total_records - prev_total
            total_growth = (
                round((total_diff / prev_total) * 100, 1)
                if prev_total > 0
                else (100.0 if total_records > 0 else 0.0)
            )

            answered_diff = current_answered - prev_answered
            answered_growth = (
                round((answered_diff / prev_answered) * 100, 1)
                if prev_answered > 0
                else (100.0 if current_answered > 0 else 0.0)
            )

            comparison_info = {
                "compare_mode": compare_mode,
                "prev_start_date": prev_start.strftime("%Y-%m-%d"),
                "prev_end_date": prev_end.strftime("%Y-%m-%d"),
                "prev_total": prev_total,
                "total_growth_percent": total_growth,
                "prev_answered": prev_answered,
                "answered_growth_percent": answered_growth,
                "prev_key_pressed": prev_key_pressed,
            }

        # Danh sách 10 bản ghi gần nhất
        recent_records = EkycRecordSerializer(queryset[:10], many=True).data

        return Response(
            {
                "total_records": total_records,
                "granularity": granularity,
                "compare_mode": compare_mode,
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "status_breakdown": status_data,
                "result_breakdown": result_data,
                "daily_trends": daily_trends,
                "comparison": comparison_info,
                "recent_records": recent_records,
            }
        )

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):
        """
        Xuất toàn bộ danh sách eKYC ra file Excel theo bộ lọc.
        """
        try:
            from openpyxl import Workbook
        except ImportError:
            return Response({"detail": "Hệ thống chưa cài openpyxl."}, status=500)

        queryset = self.get_queryset()

        wb = Workbook()
        ws = wb.active
        ws.title = "Danh_Sach_eKYC"

        headers = [
            "STT",
            "Số TK lưu kí",
            "Tên KH",
            "Chi nhánh",
            "Tên người quản lý",
            "SĐT khách hàng",
            "Ngày gọi",
            "Số lần follow",
            "Tình trạng",
            "Kết quả cuộc gọi",
            "Ghi chú",
            "Người tạo",
            "Ngày tạo",
        ]
        ws.append(headers)

        for idx, rec in enumerate(queryset, start=1):
            created_by = ""
            if rec.created_by_user:
                created_by = (
                    getattr(rec.created_by_user, "first_name", "")
                    + " "
                    + getattr(rec.created_by_user, "last_name", "")
                ).strip() or rec.created_by_user.username

            ws.append(
                [
                    idx,
                    rec.account_number,
                    rec.customer_name,
                    rec.branch_name,
                    rec.manager_name,
                    rec.phone,
                    rec.call_date.strftime("%d/%m/%Y") if rec.call_date else "",
                    rec.follow_count,
                    rec.call_status,
                    rec.call_result,
                    rec.note or "",
                    created_by,
                    rec.created_at.strftime("%d/%m/%Y %H:%M") if rec.created_at else "",
                ]
            )

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        filename = f"eKYC_Export_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
