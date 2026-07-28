from __future__ import annotations

import calendar
import random
from collections import Counter
from datetime import date, datetime, time, timedelta
from typing import Any

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.branches.models import Branch, Employee, OrganizationUnit
from apps.customers.models import (
    Company,
    Customer,
    CustomerAccount,
    CustomerRating,
    CustomerSource,
    CustomerType,
    MembershipTier,
)
from apps.tickets.dashboard_cache import invalidate_ticket_dashboard_cache
from apps.tickets.models import (
    Tag,
    Ticket,
    TicketAccountLinkStatus,
    TicketActivityLog,
    TicketAssignment,
    TicketAttachment,
    TicketClassification,
    TicketComment,
    TicketErrorGroup,
    TicketErrorType,
    TicketFeedback,
    TicketFollower,
    TicketPriority,
    TicketProcessLog,
    TicketResponse,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
    TicketTag,
    TicketUpdateLog,
)

TICKET_CODE_PREFIX = "CCC-DEMO-2026-"
SOURCE_REF_PREFIX = "CCC-DEMO-REF-2026-"

SYSTEM_OPTIONS = [
    "BASE",
    "FLEX",
    "APP",
    "WEB",
    "CRM",
    "API",
    "CHATBOT",
    "PORTAL",
    "OTHER",
]

EXTERNAL_STATUS_OPTIONS = [
    "SYNCED",
    "PENDING",
    "RETRY",
    "FAILED",
]

COMMENT_OPTIONS = [
    "Đã liên hệ khách hàng qua điện thoại để làm rõ thông tin chi tiết.",
    "Đã đối chiếu số tài khoản, thông tin giao dịch và nhật ký hệ thống.",
    "Khách hàng đã gửi bổ sung ảnh chụp màn hình phát sinh lỗi.",
    "Đã chuyển yêu cầu cho bộ phận CNTT / Kế toán tra soát nội bộ.",
    "Đang theo dõi phản hồi kết quả từ hệ thống nghiệp vụ FLEX.",
    "Đã cập nhật tiến độ xử lý và hẹn thời gian phản hồi cho khách hàng.",
    "Kiểm tra nhật ký xác thực OTP và đồng bộ trạng thái tài khoản.",
    "Khách hàng xác nhận hệ thống đã hoạt động bình thường.",
]

TRANSFER_REASON_OPTIONS = [
    "Phân công tự động theo luồng trực ca CCC.",
    "Cân bằng tải công việc giữa các nhân viên hỗ trợ.",
    "Chuyển đơn vị chuyên môn (IT / Kế toán / Nghiệp vụ) xử lý chuyên sâu.",
    "Nhân viên tiếp nhận ban đầu hết ca trực, điều phối cho nhân viên ca sau.",
    "Chuyển chi nhánh quản lý tài khoản hỗ trợ trực tiếp khách hàng.",
]

CANCEL_REASON_OPTIONS = [
    "Khách hàng xác nhận sự cố đã tự khôi phục, không cần hỗ trợ thêm.",
    "Yêu cầu tạo trùng lặp với ticket đã được tiếp nhận trước đó.",
    "Không thể liên hệ với khách hàng sau 3 lần gọi xác minh.",
    "Khách hàng chủ động yêu cầu hủy yêu cầu hỗ trợ.",
]

FIELD_UPDATE_NOTES = [
    "Cập nhật mức độ ưu tiên và bổ sung nhóm lỗi sau khi đối chiếu thông tin.",
    "Ghi nhận giải pháp xử lý tạm thời và cập nhật hệ thống liên quan.",
    "Thay đổi thông tin phân loại ticket dựa trên phản ánh chi tiết của khách hàng.",
    "Bổ sung ghi chú lỗi nghiệp vụ và điều chỉnh chính sách SLA áp dụng.",
]

SCENARIOS = [
    {
        "keywords": ("GIAO_DICH", "LENH", "CHUNG_KHOAN"),
        "titles": [
            "Kiểm tra trạng thái lệnh đặt chứng khoán",
            "Lệnh giao dịch chưa cập nhật kết quả khớp",
            "Không thể sửa hoặc hủy lệnh trên bảng giá",
            "Cần hỗ trợ tra soát thời điểm gửi lệnh",
            "Lệnh điều kiện không kích hoạt tự động",
        ],
        "requests": [
            "Khách hàng phản ánh lệnh đặt đã gửi nhưng ứng dụng không hiển thị trạng thái khớp.",
            "Khách hàng không thực hiện được thao tác sửa giá lệnh và cần kiểm tra nguyên nhân.",
            "Khách hàng yêu cầu đối chiếu thời gian ghi nhận lệnh trên hệ thống FLEX.",
            "Sức mua tài khoản thay đổi nhưng danh sách lệnh chưa được cập nhật tương ứng.",
            "Khách hàng phản ánh lệnh điều kiện Stop-Loss chưa được kích hoạt khi cán mốc giá.",
        ],
        "solutions": [
            "Đối chiếu nhật ký lệnh trên hệ thống FLEX và kiểm tra kết quả trả về từ Sở.",
            "Hướng dẫn khách hàng tải lại dữ liệu bảng giá và kiểm tra kết nối mạng.",
            "Chuyển thông tin cho bộ phận Quản lý giao dịch để tra soát luồng xử lý lệnh.",
            "Đồng bộ lại trạng thái sức mua và danh sách lệnh trên ứng dụng di động.",
        ],
        "responses": [
            "Đã kiểm tra và cập nhật đầy đủ trạng thái lệnh cho khách hàng.",
            "Đã hướng dẫn khách hàng thao tác lại sau khi hệ thống hoàn tất đồng bộ.",
            "Kết quả tra soát lệnh chi tiết đã được gửi qua email cho khách hàng.",
            "Lệnh điều kiện đã được khôi phục trạng thái chờ kích hoạt.",
        ],
        "system": "FLEX",
    },
    {
        "keywords": ("DANG_NHAP", "UNG_DUNG", "APP", "MAT_KHAU"),
        "titles": [
            "Không thể đăng nhập vào ứng dụng giao dịch",
            "Tài khoản bị khóa do nhập sai mật khẩu",
            "Không nhận được mã OTP xác thực SMS/Email",
            "Ứng dụng báo sai thông tin danh tính xác thực",
            "Lỗi xác thực Biometrics (Vân tay / FaceID)",
        ],
        "requests": [
            "Khách hàng nhập đúng tài khoản và mật khẩu nhưng ứng dụng báo lỗi kết nối.",
            "Khách hàng không nhận được mã OTP SMS sau nhiều lần bấm yêu cầu gửi lại.",
            "Tài khoản bị tạm khóa truy cập và khách hàng cần hỗ trợ mở khóa gấp.",
            "Khách hàng thay đổi thiết bị di động mới và không thể xác thực bước 2.",
            "Ứng dụng không nhận diện được sinh trắc học FaceID sau khi cập nhật iOS/Android.",
        ],
        "solutions": [
            "Kiểm tra trạng thái tài khoản, nhật ký gửi OTP và hướng dẫn xác thực lại.",
            "Đồng bộ lại session đăng nhập và yêu cầu khách hàng cập nhật phiên bản App mới nhất.",
            "Chuyển bộ phận Kỹ thuật kiểm tra Gateway SMS và log xác thực thiết bị.",
            "Mở khóa tài khoản trên hệ thống CRM và gửi lại mật khẩu tạm cho khách hàng.",
        ],
        "responses": [
            "Khách hàng đã đăng nhập ứng dụng thành công.",
            "Tài khoản đã được mở khóa và gửi thông tin hướng dẫn đổi mật khẩu.",
            "Đã khắc phục luồng OTP SMS, khách hàng xác nhận đã nhận được mã.",
            "Đã hỗ trợ đăng ký lại sinh trắc học trên thiết bị mới.",
        ],
        "system": "APP",
    },
    {
        "keywords": ("HIEN_THI", "GIAO_DIEN", "DU_LIEU"),
        "titles": [
            "Dữ liệu tổng tài sản hiển thị chưa chính xác",
            "Danh mục chứng khoán không tự động cập nhật",
            "Giao diện ứng dụng bị lỗi phông chữ / trắng màn hình",
            "Số dư tiền khả dụng hiển thị chậm so với giao dịch",
            "Lịch sử quyền chứng khoán hiển thị thiếu thông tin",
        ],
        "requests": [
            "Khách hàng phản ánh dữ liệu tổng tài sản trên màn hình trang chủ bị sai lệch.",
            "Danh mục chứng khoán nắm giữ không hiển thị mã vừa khớp trong phiên.",
            "Số dư tiền và sức mua không đồng nhất giữa màn hình Đặt lệnh và màn hình Tài sản.",
            "Khách hàng gặp lỗi màn hình trắng khi mở mục Báo cáo tài sản chi tiết.",
            "Thông tin cổ tức và quyền mua cổ phiếu chưa hiển thị trong sổ cổ đông.",
        ],
        "solutions": [
            "Kiểm tra dữ liệu đồng bộ giữa hệ thống APP, API backend và cơ sở dữ liệu FLEX.",
            "Hướng dẫn khách hàng thao tác Xóa bộ nhớ đệm (Cache) trên ứng dụng.",
            "Chuyển bộ phận Kỹ thuật kiểm tra API lấy danh mục và sửa lỗi hiển thị.",
            "Cập nhật lại bảng tính giá trị tài sản thực tế cho tài khoản khách hàng.",
        ],
        "responses": [
            "Dữ liệu tài sản đã được đồng bộ chuẩn xác trên giao diện.",
            "Đã khắc phục triệt để lỗi hiển thị danh mục chứng khoán.",
            "Khách hàng xác nhận số dư tiền đã cập nhật chuẩn sau khi làm mới.",
            "Thông tin quyền chứng khoán đã được bổ sung đầy đủ.",
        ],
        "system": "APP",
    },
    {
        "keywords": ("EKYC", "DINH_DANH", "TAI_KHOAN", "MO_TAI_KHOAN"),
        "titles": [
            "eKYC không nhận diện được Căn cước công dân",
            "Yêu cầu cập nhật thông tin Căn cước gắn chip",
            "Không hoàn tất bước xác thực khuôn mặt eKYC",
            "Kiểm tra tiến độ duyệt hồ sơ mở tài khoản trực tuyến",
            "Lỗi liên kết tài khoản ngân hàng chính chủ",
        ],
        "requests": [
            "Khách hàng mở tài khoản trực tuyến nhưng không qua được bước chụp CCCD.",
            "Khách hàng đã đổi sang CCCD gắn chip mới và muốn cập nhật thông tin tài khoản.",
            "Khách hàng bị báo lỗi ở bước quay video xác thực khuôn mặt eKYC.",
            "Hồ sơ mở tài khoản đã hoàn tất thông tin nhưng chưa nhận được email kích hoạt.",
            "Khách hàng không thể thêm tài khoản ngân hàng thụ hưởng vào hệ thống.",
        ],
        "solutions": [
            "Kiểm tra nhật ký OCR eKYC, hướng dẫn chụp ảnh giấy tờ trong điều kiện đủ sáng.",
            "Đối chiếu hình ảnh CCCD mới và thực hiện cập nhật thông tin trên hệ thống.",
            "Kiểm tra dữ liệu đối soát xác thực khuôn mặt và phê duyệt hồ sơ thủ công.",
            "Kích hoạt tài khoản chứng khoán và gửi thông báo cho khách hàng qua Email/SMS.",
        ],
        "responses": [
            "Khách hàng đã hoàn tất định danh eKYC và kích hoạt tài khoản thành công.",
            "Thông tin CCCD mới đã được cập nhật chính xác trên hệ thống.",
            "Hồ sơ mở tài khoản đã được phê duyệt.",
            "Tài khoản ngân hàng thụ hưởng đã được liên kết thành công.",
        ],
        "system": "APP",
    },
    {
        "keywords": ("NAP_TIEN", "RUT_TIEN", "CHUYEN_KHOAN", "THANH_TOAN"),
        "titles": [
            "Nạp tiền vào tài khoản chứng khoán chưa ghi nhận",
            "Yêu cầu kiểm tra xử lý lệnh rút tiền về ngân hàng",
            "Chuyển tiền nội bộ giữa các tiểu khoản chậm",
            "Tra soát giao dịch nạp tiền sai nội dung chuyển khoản",
            "Lỗi kết nối cổng thanh toán ngân hàng liên kết",
        ],
        "requests": [
            "Khách hàng đã chuyển tiền từ ngân hàng nhưng sức mua tài khoản chưa tăng.",
            "Lệnh rút tiền về tài khoản ngân hàng chính chủ bị treo ở trạng thái Chờ xử lý.",
            "Chuyển tiền từ tiểu khoản Thường sang tiểu khoản Margin không thành công.",
            "Khách hàng chuyển tiền nạp nhưng quên ghi số tài khoản chứng khoán trong nội dung.",
            "Giao dịch chuyển tiền báo thành công ở ngân hàng nhưng CRM chưa ghi nhận.",
        ],
        "solutions": [
            "Đối chiếu sổ phụ ngân hàng, kiểm tra điện chuyển tiền và nội dung hạch toán.",
            "Kiểm tra luồng rút tiền trên FLEX, phối hợp bộ phận Kế toán hoàn tất lệnh.",
            "Tra soát thông tin định danh người nạp và hạch toán thủ công vào tài khoản.",
            "Cập nhật trạng thái giao dịch và phản hồi thông tin cho khách hàng.",
        ],
        "responses": [
            "Số tiền nạp đã được hạch toán đầy đủ vào tài khoản chứng khoán.",
            "Giao dịch rút tiền đã hoàn tất, tiền đã về tài khoản ngân hàng của khách hàng.",
            "Đã xử lý tra soát và hạch toán khoản tiền chuyển sai nội dung.",
            "Tiểu khoản đã ghi nhận đủ sức mua từ lệnh chuyển tiền nội bộ.",
        ],
        "system": "FLEX",
    },
    {
        "keywords": ("PORTAL", "HE_THONG", "API", "CRM"),
        "titles": [
            "Portal khách hàng không tải được dữ liệu báo cáo",
            "Lỗi đồng bộ dữ liệu giữa CRM và hệ thống FLEX",
            "API tiếp nhận yêu cầu hỗ trợ trả về mã lỗi 500",
            "Hệ thống báo cáo CCC phản hồi chậm giờ cao điểm",
            "Không nhận được thông báo Web Push Notification",
        ],
        "requests": [
            "Người dùng phản ánh Web Portal không tải được báo cáo sao kê tài khoản.",
            "Dữ liệu khách hàng trên CRM không cập nhật đồng bộ từ hệ thống lõi.",
            "API tích hợp đối tác báo lỗi kết nối trong quá trình đẩy dữ liệu ticket.",
            "Hệ thống ghi nhận thời gian phản hồi chậm khi tra cứu lịch sử xử lý.",
            "Khách hàng không nhận được thông báo biến động số dư qua ứng dụng.",
        ],
        "solutions": [
            "Kiểm tra nhật ký API Gateway, dịch vụ Microservices và luồng Message Queue.",
            "Thực hiện re-sync dữ liệu bản ghi bị lỗi giữa CRM và FLEX.",
            "Tối ưu hóa truy vấn cơ sở dữ liệu và xóa bộ nhớ đệm Dashboard.",
            "Kiểm tra cấu hình Push Notification Service và gửi lại thông báo.",
        ],
        "responses": [
            "Dữ liệu báo cáo trên Portal đã được phục hồi và tải bình thường.",
            "Hệ thống CRM đã hoàn tất đồng bộ dữ liệu chuẩn với FLEX.",
            "Lỗi API đã được khắc phục, tích hợp hoạt động ổn định.",
            "Dịch vụ thông báo đã được khôi phục hoàn tất.",
        ],
        "system": "API",
    },
    {
        "keywords": ("KHIEU_NAI", "GOP_Y", "PHAN_ANH"),
        "titles": [
            "Khách hàng khiếu nại thời gian xử lý ticket kéo dài",
            "Góp ý cải thiện chất lượng phục vụ của tổng đài",
            "Phản ánh kết quả xử lý chưa thỏa đáng",
            "Yêu cầu xem xét lại chính sách phí giao dịch",
            "Khiếu nại thái độ hỗ trợ của nhân viên tư vấn",
        ],
        "requests": [
            "Khách hàng phản ánh yêu cầu hỗ trợ đã gửi 3 ngày nhưng chưa có phản hồi chính thức.",
            "Khách hàng không đồng ý với kết quả giải quyết sự cố lệnh trước đó.",
            "Khách hàng góp ý về quy trình liên hệ xác minh thông tin quá phức tạp.",
            "Khách hàng khiếu nại mức phí tính chưa đúng theo chương trình ưu đãi đã đăng ký.",
            "Khách hàng yêu cầu Cấp quản lý trực tiếp gọi lại trao đổi về vụ việc.",
        ],
        "solutions": [
            "Rà soát toàn bộ lịch sử xử lý, làm việc với các đơn vị liên quan để đẩy nhanh tiến độ.",
            "Chuyển Trưởng bộ phận CCC gọi điện trực tiếp trao đổi và giải thích cho khách hàng.",
            "Đối chiếu biểu phí ưu đãi, thực hiện thoái thu khoản phí chênh lệch nếu có sai sót.",
            "Ghi nhận góp ý để cải tiến quy trình phục vụ khách hàng tốt hơn.",
        ],
        "responses": [
            "Đã trao đổi trực tiếp, giải thích rõ ràng và khách hàng đã hoàn toàn đồng ý.",
            "Nội dung khiếu nại đã được xử lý thỏa đáng, thoái thu phí chênh lệch thành công.",
            "Góp ý của khách hàng đã được chuyển đến Ban Giám đốc ghi nhận.",
            "Khách hàng xác nhận hài lòng với phương án giải quyết bổ sung.",
        ],
        "system": "CRM",
    },
    {
        "keywords": ("CHAM_SOC", "HO_TRO", "SAN_PHAM", "KIEN_THUC"),
        "titles": [
            "Tư vấn chính sách sản phẩm giao dịch ký quỹ Margin",
            "Hỗ trợ hướng dẫn đăng ký dịch vụ Trái phiếu / Chứng quyền",
            "Khách hàng cần cung cấp sao kê tài khoản có xác nhận",
            "Hướng dẫn thao tác thực hiện quyền mua cổ phiếu phát hành thêm",
            "Tư vấn nâng hạn mức giao dịch chứng khoán",
        ],
        "requests": [
            "Khách hàng liên hệ tổng đài hỏi về lãi suất Margin và danh mục chứng khoán cho vay.",
            "Khách hàng cần hướng dẫn thao tác đăng ký mua cổ phiếu phát hành thêm trên App.",
            "Khách hàng yêu cầu cấp bản sao kê tài khoản giao dịch có dấu đỏ xác nhận.",
            "Khách hàng cần giải thích điều kiện nâng hạn mức giao dịch trong ngày.",
            "Khách hàng hỏi về thủ tục chuyển nhượng chứng khoán ngoài hệ thống.",
        ],
        "solutions": [
            "Tư vấn chi tiết quy định, gửi tài liệu hướng dẫn và danh mục Margin qua Email.",
            "Hướng dẫn chi tiết từng bước thao tác thực hiện quyền trên ứng dụng di động.",
            "Xác nhận thông tin, in sao kê và gửi qua đường bưu điện/email cho khách hàng.",
            "Giải thích quy trình thẩm định nâng hạn mức và gửi biểu mẫu đăng ký.",
        ],
        "responses": [
            "Khách hàng đã nhận được đầy đủ thông tin tư vấn và tài liệu chi tiết.",
            "Đã hướng dẫn và khách hàng thực hiện thao tác quyền mua thành công.",
            "Sao kê tài khoản đã được phát hành và gửi tới khách hàng.",
            "Khách hàng đã nắm rõ thủ tục và gửi biểu mẫu hoàn tất.",
        ],
        "system": "CRM",
    },
]

DEFAULT_SCENARIO = {
    "titles": [
        "Yêu cầu hỗ trợ chung từ khách hàng",
        "Kiểm tra và xác minh thông tin dịch vụ",
        "Hỗ trợ giải quyết sự cố kỹ thuật phát sinh",
        "Tra soát nội dung khách hàng phản ánh qua tổng đài",
    ],
    "requests": [
        "Khách hàng liên hệ Trung tâm Chăm sóc Khách hàng cần hỗ trợ kiểm tra thông tin tài khoản.",
        "Khách hàng phản ánh vấn đề phát sinh trong quá trình sử dụng dịch vụ chứng khoán.",
        "Khách hàng yêu cầu kiểm tra tiến độ và cập nhật kết quả xử lý yêu cầu.",
        "Khách hàng cần nhân viên tư vấn hướng dẫn thêm quy trình giao dịch.",
    ],
    "solutions": [
        "Tiếp nhận thông tin, xác minh dữ liệu trên hệ thống và phối hợp xử lý.",
        "Đối chiếu thông tin chi tiết và cập nhật tiến độ xử lý cho khách hàng.",
        "Hướng dẫn khách hàng bổ sung giấy tờ / thông tin cần thiết.",
    ],
    "responses": [
        "Yêu cầu hỗ trợ đã được hoàn tất và phản hồi đầy đủ cho khách hàng.",
        "Khách hàng đã xác nhận kết quả xử lý thành công.",
        "Đã hoàn thành nội dung tra soát theo yêu cầu.",
    ],
    "system": "CRM",
}

SAMPLE_CUSTOMER_NAMES = [
    ("Nguyễn Văn Anh", "MALE"),
    ("Trần Thị Bích", "FEMALE"),
    ("Lê Hoàng Cường", "MALE"),
    ("Phạm Minh Đức", "MALE"),
    ("Vũ Phương Thảo", "FEMALE"),
    ("Đặng Quang Huy", "MALE"),
    ("Bùi Thị Mai", "FEMALE"),
    ("Phan Thanh Nam", "MALE"),
    ("Trịnh Quốc Việt", "MALE"),
    ("Hoàng Kim Oanh", "FEMALE"),
    ("Đỗ Văn Hùng", "MALE"),
    ("Nguyễn Thị Phương", "FEMALE"),
    ("Trần Đức Thắng", "MALE"),
    ("Lê Minh Tuấn", "MALE"),
    ("Phạm Ngọc Ánh", "FEMALE"),
    ("Vũ Hoàng Long", "MALE"),
    ("Đặng Thu Hà", "FEMALE"),
    ("Bùi Anh Tuấn", "MALE"),
    ("Phan Mỹ Linh", "FEMALE"),
    ("Nghiêm Xuân Trường", "MALE"),
]


class Command(BaseCommand):
    help = (
        "Tạo dữ liệu ticket CCC mẫu đa dạng từ 2026-01-01 đến nay. "
        "Đảm bảo phân công đều cho nhân viên trong bảng Employee, "
        "gán khách hàng thực tế và tạo lịch sử chỉnh sửa / thời gian xử lý chi tiết."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--branch-code",
            default="HS_Q7",
            help="Mã Hội sở chứa nhân viên CCC. Mặc định: HS_Q7.",
        )
        parser.add_argument(
            "--per-month",
            type=int,
            default=35,
            help="Số ticket tạo cho mỗi tháng. Mặc định: 35.",
        )
        parser.add_argument(
            "--start-date",
            default="2026-01-01",
            help="Ngày bắt đầu dạng YYYY-MM-DD. Mặc định: 2026-01-01.",
        )
        parser.add_argument(
            "--end-date",
            default=None,
            help="Ngày kết thúc dạng YYYY-MM-DD. Mặc định là ngày hiện tại.",
        )
        parser.add_argument(
            "--random-seed",
            type=int,
            default=20260724,
            help="Seed cho bộ sinh số ngẫu nhiên để kết quả ổn định.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Xóa toàn bộ ticket có mã bắt đầu bằng CCC-DEMO-2026- trước khi tạo lại.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        per_month = options["per_month"]
        if per_month <= 0:
            raise CommandError("--per-month phải lớn hơn 0.")

        start_date = self._parse_date(options["start_date"], "--start-date")

        if options["end_date"]:
            end_date = self._parse_date(options["end_date"], "--end-date")
        else:
            end_date = min(timezone.localdate(), date(2026, 7, 31))

        if start_date > end_date:
            raise CommandError("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.")

        if start_date.year != 2026:
            raise CommandError("Command này tạo dữ liệu từ đầu năm 2026 đến nay.")

        rng = random.Random(options["random_seed"])

        if options["reset"]:
            deleted_count, _ = Ticket.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Đã xóa toàn bộ {deleted_count} bản ghi ticket và dữ liệu liên quan trong DB."
                )
            )

        branch = self._find_branch(options["branch_code"])

        # Ensure sample customers and customer accounts exist in DB
        customers, customer_accounts, companies = self._ensure_customer_pool(branch, rng)

        # Load ALL active employees from Employee table
        employees, users, supervisor_user = self._load_all_people(branch)

        categories = list(
            TicketSupportCategory.objects.filter(is_active=True).order_by(
                "sort_order", "id"
            )
        )
        statuses = list(
            TicketStatus.objects.filter(is_active=True).order_by("sort_order", "id")
        )
        priorities = list(
            TicketPriority.objects.filter(is_active=True).order_by(
                "level_order", "id"
            )
        )
        sources = list(TicketSource.objects.filter(is_active=True).order_by("id"))

        if not categories or not statuses or not priorities or not sources:
            raise CommandError(
                "Chưa có đủ danh mục ticket master (Category/Status/Priority/Source). "
                "Hãy chạy python manage.py seed_ticket_master trước."
            )

        classifications = list(
            TicketClassification.objects.filter(is_active=True).select_related(
                "support_category"
            )
        )
        error_groups = list(
            TicketErrorGroup.objects.filter(is_active=True).order_by(
                "sort_order", "id"
            )
        )
        error_types = list(
            TicketErrorType.objects.filter(is_active=True)
            .select_related("group")
            .order_by("group__sort_order", "sort_order", "id")
        )
        tags = list(Tag.objects.filter(is_active=True).order_by("id"))
        units = self._load_organization_units(branch, employees)
        sla_policies = self._load_sla_policies()

        ticket_datetimes = self._build_ticket_datetimes(
            start_date=start_date,
            end_date=end_date,
            per_month=per_month,
            rng=rng,
        )

        if not ticket_datetimes:
            raise CommandError("Không tạo được mốc thời gian ticket trong khoảng đã chọn.")

        forced_status_by_index = self._build_forced_status_positions(
            total=len(ticket_datetimes),
            statuses=statuses,
        )

        created_count = 0
        updated_count = 0
        status_counter: Counter[str] = Counter()
        month_counter: Counter[str] = Counter()
        employee_counter: Counter[str] = Counter()
        customer_counter: Counter[str] = Counter()

        execution_cap = self._execution_cap(end_date)

        for index, created_at in enumerate(ticket_datetimes, start=1):
            assigned_employee = employees[(index - 1) % len(employees)]
            assigned_user = self._get_employee_user(assigned_employee, supervisor_user or users[0])
            created_by_user = supervisor_user or assigned_user

            category = rng.choice(categories)
            classification = self._choose_classification(
                category=category,
                classifications=classifications,
                rng=rng,
            )
            priority = rng.choice(priorities)
            source = rng.choice(sources)

            if (index - 1) in forced_status_by_index:
                status = forced_status_by_index[index - 1]
            else:
                status = self._choose_status(
                    statuses=statuses,
                    created_at=created_at,
                    end_date=end_date,
                    rng=rng,
                )

            error_group, error_type = self._choose_error(
                error_groups=error_groups,
                error_types=error_types,
                rng=rng,
            )

            scenario = self._choose_scenario(
                category=category,
                classification=classification,
            )

            (
                customer,
                customer_account,
                company,
                account_link_status,
                raw_account_number,
            ) = self._choose_customer_data(
                customers=customers,
                customer_accounts=customer_accounts,
                companies=companies,
                rng=rng,
            )

            handling_unit = self._choose_unit(
                units=units,
                employee=assigned_employee,
                rng=rng,
            )

            sla_policy = self._choose_sla_policy(
                policies=sla_policies,
                category=category,
                priority=priority,
                rng=rng,
            )

            related_system = (
                getattr(error_type, "related_system", None)
                or getattr(error_group, "related_system", None)
                or scenario["system"]
                or rng.choice(SYSTEM_OPTIONS)
            )

            source_code = (source.source_code or "").upper()
            classification_method = (
                "AUTO"
                if any(
                    token in source_code
                    for token in ("API", "CHATBOT", "BOT", "WEBHOOK", "SYSTEM")
                )
                or rng.random() < 0.30
                else "MANUAL"
            )

            timeline_times = self._build_timeline_times(
                created_at=created_at,
                current_status=status,
                cap=execution_cap,
                rng=rng,
            )
            stage = self._status_stage(status)

            title = rng.choice(scenario["titles"])
            if error_type and rng.random() < 0.45:
                title = f"{title} - {error_type.type_name}"

            customer_text = customer.full_name if customer else "Khách hàng cá nhân"
            request_content = (
                f"{rng.choice(scenario['requests'])} "
                f"Người liên hệ: {customer_text}. "
                f"Mã tra cứu: CCC-{index:04d}."
            )
            handling_solution = (
                rng.choice(scenario["solutions"])
                if stage in {"processing", "done", "pending_close", "closed"}
                else None
            )
            final_response = (
                rng.choice(scenario["responses"])
                if stage in {"done", "pending_close", "closed"}
                else None
            )
            cancelled_reason = (
                rng.choice(CANCEL_REASON_OPTIONS) if stage == "cancelled" else None
            )

            external_status = None
            last_synced_at = None
            if classification_method == "AUTO" or rng.random() < 0.40:
                external_status = rng.choice(EXTERNAL_STATUS_OPTIONS)
                last_synced_at = min(
                    timeline_times.get("updated") or created_at,
                    execution_cap,
                )

            ticket_code = f"{TICKET_CODE_PREFIX}{index:04d}"
            source_ref_id = f"{SOURCE_REF_PREFIX}{index:04d}"

            defaults = {
                "title": title[:255],
                "customer": customer,
                "company": company,
                "customer_account": customer_account,
                "account_link_status": account_link_status,
                "raw_account_number": raw_account_number,
                "handling_branch": assigned_employee.branch or branch,
                "handling_unit": handling_unit,
                "assigned_employee": assigned_employee,
                "owner_user": assigned_user,
                "owner_employee": assigned_employee,
                "support_category": category,
                "classification": classification,
                "current_status": status,
                "priority": priority,
                "source": source,
                "sla_policy": sla_policy,
                "classification_method": classification_method,
                "source_ref_id": source_ref_id,
                "error_group": error_group,
                "error_type": error_type,
                "error_note": (
                    f"Ghi nhận nhóm lỗi: {error_group.group_name} - Loại: {error_type.type_name}."
                    if error_group and error_type
                    else (f"Ghi nhận lỗi: {error_type.type_name}." if error_type else None)
                ),
                "related_system": related_system,
                "external_status": external_status,
                "last_synced_at": last_synced_at,
                "request_content": request_content,
                "handling_solution": handling_solution,
                "final_response": final_response,
                "assigned_at": timeline_times["assigned"],
                "accepted_at": timeline_times.get("accepted"),
                "processing_started_at": timeline_times.get("processing"),
                "done_at": timeline_times.get("done"),
                "closed_at": timeline_times.get("closed"),
                "cancelled_at": timeline_times.get("cancelled"),
                "accepted_by_user": (
                    assigned_user
                    if timeline_times.get("accepted")
                    else None
                ),
                "done_by_user": (
                    assigned_user
                    if timeline_times.get("done")
                    else None
                ),
                "closed_by_user": (
                    supervisor_user or assigned_user
                    if timeline_times.get("closed")
                    else None
                ),
                "cancelled_by_user": (
                    supervisor_user or assigned_user
                    if timeline_times.get("cancelled")
                    else None
                ),
                "cancelled_reason": cancelled_reason,
                "is_locked_for_amend": stage in {"closed", "cancelled"},
                "created_by_user": created_by_user,
                "updated_by_user": assigned_user,
            }

            ticket, was_created = Ticket.objects.update_or_create(
                ticket_code=ticket_code,
                defaults=defaults,
            )

            if was_created:
                created_count += 1
            else:
                updated_count += 1

            updated_at = timeline_times.get("updated") or created_at
            self._set_timestamp_fields(
                model=Ticket,
                object_id=ticket.pk,
                created_at=created_at,
                updated_at=updated_at,
            )

            # Rebuild detailed update, activity & process logs (lịch sử chỉnh sửa & thời gian quản lý)
            self._rebuild_related_data(
                ticket=ticket,
                status=status,
                statuses=statuses,
                timeline_times=timeline_times,
                assigned_employee=assigned_employee,
                all_employees=employees,
                assigned_user=assigned_user,
                created_by_user=created_by_user,
                supervisor_user=supervisor_user,
                branch=branch,
                unit=handling_unit,
                priority=priority,
                sla_policy=sla_policy,
                customer=customer,
                scenario=scenario,
                tags=tags,
                all_users=users,
                rng=rng,
            )

            status_counter[status.status_code] += 1
            month_counter[created_at.strftime("%Y-%m")] += 1
            employee_counter[assigned_employee.full_name] += 1
            if customer:
                customer_counter[customer.full_name] += 1

        # Invalidate dashboard cache so new data reflects immediately
        try:
            invalidate_ticket_dashboard_cache()
            self.stdout.write(self.style.SUCCESS("Đã xóa cache Dashboard CCC Ticket."))
        except Exception:
            pass

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== HOÀN TẤT SEED TICKET CCC DỮ LIỆU ĐA DẠNG 2026 ==="))
        self.stdout.write(f"- Tổng số ticket seed: {len(ticket_datetimes)}")
        self.stdout.write(f"- Số ticket tạo mới: {created_count}")
        self.stdout.write(f"- Số ticket cập nhật: {updated_count}")
        self.stdout.write(f"- Số nhân viên phân công: {len(employees)}")
        self.stdout.write(f"- Số khách hàng liên kết: {len(customer_counter)}")
        self.stdout.write(
            f"- Khoảng thời gian: {start_date.isoformat()} đến {end_date.isoformat()}"
        )

        self.stdout.write("\nPhân bổ theo tháng:")
        for key in sorted(month_counter):
            self.stdout.write(f"  {key}: {month_counter[key]} ticket")

        self.stdout.write("\nPhân bổ theo trạng thái:")
        for st in statuses:
            self.stdout.write(
                f"  {st.status_code} ({st.status_name}): {status_counter[st.status_code]} ticket"
            )

        self.stdout.write("\nPhân bổ theo nhân viên tiêu biểu (Top 5):")
        for emp_name, count in employee_counter.most_common(5):
            self.stdout.write(f"  - {emp_name}: {count} ticket")

    def _parse_date(self, raw_value: str, option_name: str) -> date:
        try:
            return date.fromisoformat(raw_value)
        except ValueError as exc:
            raise CommandError(
                f"{option_name} phải có định dạng YYYY-MM-DD."
            ) from exc

    def _get_employee_user(self, employee: Employee, fallback: User) -> User:
        try:
            user = employee.user_account
            if user and getattr(user, "is_active", True):
                return user
        except Exception:
            pass
        return fallback

    def _find_branch(self, branch_code: str) -> Branch:
        branch = Branch.objects.filter(
            branch_code=branch_code,
            status="ACTIVE",
        ).first()

        if branch:
            return branch

        branch = (
            Branch.objects.filter(status="ACTIVE")
            .filter(
                Q(branch_code__icontains="HS")
                | Q(branch_code__icontains="HO")
                | Q(branch_name__icontains="hội sở")
            )
            .first()
        )

        if not branch:
            branch = Branch.objects.filter(status="ACTIVE").first()

        if not branch:
            raise CommandError("Không tìm thấy Chi nhánh / Hội sở nào đang ACTIVE trong DB.")

        return branch

    def _ensure_customer_pool(
        self,
        branch: Branch,
        rng: random.Random,
    ) -> tuple[list[Customer], list[CustomerAccount], list[Company]]:
        active_customers = list(
            Customer.objects.filter(status="ACTIVE")
            .select_related("company", "membership_tier", "branch")
            .order_by("id")
        )

        # If customers count is less than 15, seed sample active customers
        if len(active_customers) < 15:
            customer_type = CustomerType.objects.filter(is_active=True).first()
            membership_tier = MembershipTier.objects.filter(is_active=True).first()
            customer_source = CustomerSource.objects.filter(is_active=True).first()

            for i, (name, gender) in enumerate(SAMPLE_CUSTOMER_NAMES, start=1):
                code = f"KH-2026-{i:03d}"
                acc_num = f"058C{i:06d}"
                phone = f"090{i:07d}"
                email = f"khachhang{i}@gmail.com"

                cust, _ = Customer.objects.get_or_create(
                    customer_code=code,
                    defaults={
                        "full_name": name,
                        "gender": gender,
                        "phone": phone,
                        "email": email,
                        "branch": branch,
                        "customer_type": customer_type,
                        "membership_tier": membership_tier,
                        "source": customer_source,
                        "status": "ACTIVE",
                    },
                )

                CustomerAccount.objects.get_or_create(
                    account_number=acc_num,
                    defaults={
                        "customer": cust,
                        "opened_at": date(2025, 1, 1),
                        "account_status": "ACTIVE",
                        "source_system": "FLEX",
                    },
                )

            active_customers = list(
                Customer.objects.filter(status="ACTIVE")
                .select_related("company", "membership_tier", "branch")
                .order_by("id")
            )

        customer_accounts = list(
            CustomerAccount.objects.select_related(
                "customer",
                "customer__company",
                "customer__membership_tier",
            ).order_by("id")
        )
        companies = list(Company.objects.filter(status="ACTIVE").order_by("id"))

        return active_customers, customer_accounts, companies

    def _load_all_people(
        self,
        branch: Branch,
    ) -> tuple[list[Employee], list[User], User | None]:
        # Filter active employees belonging to CS or CCC department/position/roles
        cs_ccc_employees = list(
            Employee.objects.filter(status="ACTIVE")
            .filter(
                Q(organization_memberships__organization_unit__unit_code__icontains="CCC")
                | Q(organization_memberships__organization_unit__unit_code__icontains="CS")
                | Q(position__icontains="CCC")
                | Q(position__icontains="CS")
                | Q(position__icontains="Chăm sóc")
                | Q(user_account__user_roles__role__role_code__startswith="CS_")
                | Q(employee_code__icontains="CCC")
                | Q(employee_code__icontains="CS")
            )
            .distinct()
            .select_related("user_account", "branch")
            .order_by("employee_code")
        )

        employees = cs_ccc_employees if cs_ccc_employees else list(
            Employee.objects.filter(status="ACTIVE")
            .select_related("user_account", "branch")
            .order_by("employee_code")
        )

        if not employees:
            raise CommandError("Không tìm thấy nhân viên CS/CCC nào có status=ACTIVE trong DB.")

        users = list(User.objects.filter(is_active=True))
        if not users:
            raise CommandError("Không tìm thấy User nào có is_active=True trong DB.")

        supervisor_user = (
            User.objects.filter(
                is_active=True,
                user_roles__role__role_code="CS_SUPERVISOR",
            )
            .distinct()
            .first()
        ) or users[0]

        self.stdout.write(
            f"Đã nạp {len(employees)} nhân viên CS/CCC từ bảng Employee và {len(users)} người dùng hệ thống."
        )

        return employees, users, supervisor_user

    def _load_organization_units(
        self,
        branch: Branch,
        employees: list[Employee],
    ) -> list[OrganizationUnit]:
        return list(
            OrganizationUnit.objects.filter(
                is_active=True,
                is_ticket_assignable=True,
            )
            .filter(Q(branch=branch) | Q(branch__isnull=True))
            .order_by("id")
        )

    def _load_sla_policies(self) -> list[Any]:
        try:
            model = apps.get_model("sla", "SlaPolicy")
        except LookupError:
            return []

        queryset = model.objects.all()
        field_names = {field.name for field in model._meta.get_fields()}

        if "is_active" in field_names:
            queryset = queryset.filter(is_active=True)
        elif "status" in field_names:
            queryset = queryset.filter(status="ACTIVE")

        return list(queryset.order_by("id"))

    def _choose_sla_policy(
        self,
        policies: list[Any],
        category: TicketSupportCategory,
        priority: TicketPriority,
        rng: random.Random,
    ) -> Any | None:
        if not policies:
            return None

        model = policies[0].__class__
        field_names = {field.name for field in model._meta.get_fields()}

        matched = policies

        if "support_category" in field_names:
            cat_matched = [
                p for p in matched if getattr(p, "support_category_id", None) == category.pk
            ]
            if cat_matched:
                matched = cat_matched

        if "priority" in field_names:
            prio_matched = [
                p for p in matched if getattr(p, "priority_id", None) == priority.pk
            ]
            if prio_matched:
                matched = prio_matched

        return rng.choice(matched or policies)

    def _build_ticket_datetimes(
        self,
        start_date: date,
        end_date: date,
        per_month: int,
        rng: random.Random,
    ) -> list[datetime]:
        result: list[datetime] = []

        year = start_date.year
        month = start_date.month

        while (year, month) <= (end_date.year, end_date.month):
            month_start = max(start_date, date(year, month, 1))
            last_day = calendar.monthrange(year, month)[1]
            month_end = min(end_date, date(year, month, last_day))

            total_days = max(0, (month_end - month_start).days)

            for _ in range(per_month):
                selected_date = month_start + timedelta(
                    days=rng.randint(0, total_days)
                )

                max_hour = 20
                if selected_date == timezone.localdate():
                    max_hour = max(8, min(20, timezone.localtime().hour - 1))

                selected_time = time(
                    hour=rng.randint(8, max(8, max_hour)),
                    minute=rng.randint(0, 59),
                    second=rng.randint(0, 59),
                )

                value = timezone.make_aware(
                    datetime.combine(selected_date, selected_time),
                    timezone.get_current_timezone(),
                )

                if value > timezone.now():
                    value = timezone.now() - timedelta(minutes=rng.randint(5, 120))

                result.append(value)

            if month == 12:
                year += 1
                month = 1
            else:
                month += 1

        result.sort()
        return result

    def _build_forced_status_positions(
        self,
        total: int,
        statuses: list[TicketStatus],
    ) -> dict[int, TicketStatus]:
        return {}

    def _choose_status(
        self,
        statuses: list[TicketStatus],
        created_at: datetime,
        end_date: date,
        rng: random.Random,
    ) -> TicketStatus:
        closed_status = next((s for s in statuses if s.status_code == "CLOSED"), None)
        cancelled_status = next((s for s in statuses if s.status_code == "CANCELLED"), None)

        if not closed_status or not cancelled_status:
            for s in statuses:
                stage = self._status_stage(s)
                if stage in {"closed", "done"} and not closed_status:
                    closed_status = s
                elif stage == "cancelled" and not cancelled_status:
                    cancelled_status = s

        closed_status = closed_status or statuses[0]
        cancelled_status = cancelled_status or statuses[-1]

        # 80% Đã xử lý (CLOSED), 20% Hủy (CANCELLED) -> Tổng Đã xử lý + Đã hủy = Tổng tiếp nhận 100%
        if rng.random() < 0.80:
            return closed_status
        return cancelled_status

    def _status_stage(self, status: TicketStatus) -> str:
        value = f"{status.status_code} {status.status_name}".upper()

        if any(token in value for token in ("CANCEL", "CANCELED", "CANCELLED", "HỦY", "HUY")):
            return "cancelled"
        if any(token in value for token in ("CLOSED", "ĐÃ ĐÓNG", "DA DONG")):
            return "closed"
        # Không còn nhánh PENDING_CLOSE: trạng thái đó đã bỏ, và token "CHỜ ĐÓNG"
        # bây giờ nằm ngay trong tên "Đã xong (chờ đóng)" nên sẽ bắt nhầm
        # DONE_WAIT_CLOSE, đẩy nó lệch một bậc trong timeline.
        if any(token in value for token in ("DONE_WAIT_CLOSE", "DONE", "ĐÃ XONG", "DA XONG", "HOÀN TẤT", "HOAN TAT")):
            return "done"
        if any(token in value for token in ("PROCESSING", "ĐANG XỬ LÝ", "DANG XU LY")):
            return "processing"
        if any(token in value for token in ("ACCEPTED", "RECEIVED", "TIẾP NHẬN", "TIEP NHAN")):
            return "accepted"
        if any(token in value for token in ("CREATED", "OPEN", "MỞ", "MO")):
            return "created"

        return "other"

    def _choose_classification(
        self,
        category: TicketSupportCategory,
        classifications: list[TicketClassification],
        rng: random.Random,
    ) -> TicketClassification | None:
        matched = [
            item
            for item in classifications
            if item.support_category_id in (None, category.pk)
        ]
        if not matched:
            return None
        return rng.choice(matched) if rng.random() < 0.90 else None

    def _choose_error(
        self,
        error_groups: list[TicketErrorGroup],
        error_types: list[TicketErrorType],
        rng: random.Random,
    ) -> tuple[TicketErrorGroup | None, TicketErrorType | None]:
        if error_types and rng.random() < 0.70:
            error_type = rng.choice(error_types)
            return error_type.group, error_type

        if error_groups and rng.random() < 0.25:
            return rng.choice(error_groups), None

        return None, None

    def _choose_scenario(
        self,
        category: TicketSupportCategory,
        classification: TicketClassification | None,
    ) -> dict[str, Any]:
        search_text = " ".join(
            [
                category.category_code or "",
                category.category_name or "",
                classification.classification_code if classification else "",
                classification.classification_name if classification else "",
            ]
        ).upper()

        for scenario in SCENARIOS:
            if any(keyword in search_text for keyword in scenario["keywords"]):
                return scenario

        return DEFAULT_SCENARIO

    def _choose_customer_data(
        self,
        customers: list[Customer],
        customer_accounts: list[CustomerAccount],
        companies: list[Company],
        rng: random.Random,
    ) -> tuple[
        Customer | None,
        CustomerAccount | None,
        Company | None,
        str,
        str | None,
    ]:
        if customer_accounts and rng.random() < 0.85:
            customer_account = rng.choice(customer_accounts)
            customer = customer_account.customer
            company = customer.company
            return (
                customer,
                customer_account,
                company,
                TicketAccountLinkStatus.LINKED,
                customer_account.account_number,
            )

        customer = (
            rng.choice(customers)
            if customers and rng.random() < 0.90
            else None
        )

        company = customer.company if customer else None
        if company is None and companies and rng.random() < 0.20:
            company = rng.choice(companies)

        raw_account_number = "".join(str(rng.randint(0, 9)) for _ in range(10))

        return (
            customer,
            None,
            company,
            TicketAccountLinkStatus.UNLINKED,
            raw_account_number,
        )

    def _choose_unit(
        self,
        units: list[OrganizationUnit],
        employee: Employee,
        rng: random.Random,
    ) -> OrganizationUnit | None:
        if not units:
            return None

        employee_units = [
            unit
            for unit in units
            if unit.employee_memberships.filter(
                employee=employee,
                is_active=True,
            ).exists()
        ]

        if employee_units:
            return rng.choice(employee_units)

        primary_unit = employee.primary_organization_unit
        if primary_unit and primary_unit in units:
            return primary_unit

        # Không gán ngẫu nhiên một đơn vị mà nhân viên không thuộc về vì sẽ
        # tạo dữ liệu ticket không nhất quán.
        return None

    def _execution_cap(self, end_date: date) -> datetime:
        if end_date == timezone.localdate():
            return timezone.now()

        return timezone.make_aware(
            datetime.combine(end_date, time(23, 59, 59)),
            timezone.get_current_timezone(),
        )

    def _build_timeline_times(
        self,
        created_at: datetime,
        current_status: TicketStatus,
        cap: datetime,
        rng: random.Random,
    ) -> dict[str, datetime | None]:
        stage = self._status_stage(current_status)

        minimum_hours = {
            "created": 1,
            "accepted": 2,
            "processing": 4,
            "done": 8,
            "pending_close": 12,
            "closed": 24,
            "cancelled": 4,
            "other": 2,
        }.get(stage, 2)

        if cap - created_at < timedelta(hours=minimum_hours):
            created_at = cap - timedelta(hours=minimum_hours)

        values: dict[str, datetime | None] = {
            "created": created_at,
            "assigned": self._advance(
                created_at,
                rng.randint(5, 60),
                cap,
            ),
            "accepted": None,
            "processing": None,
            "done": None,
            "pending_close": None,
            "closed": None,
            "cancelled": None,
            "updated": created_at,
        }

        if stage == "cancelled":
            if rng.random() < 0.55:
                values["accepted"] = self._advance(
                    values["assigned"],
                    rng.randint(5, 60),
                    cap,
                )
            base = values["accepted"] or values["assigned"]
            values["cancelled"] = self._advance(
                base,
                rng.randint(20, 720),
                cap,
            )
            values["updated"] = values["cancelled"]
            return values

        stage_order = {
            "created": 0,
            "accepted": 1,
            "processing": 2,
            "done": 3,
            "pending_close": 4,
            "closed": 5,
            "other": 1,
        }
        current_order = stage_order.get(stage, 1)

        if current_order >= 1:
            values["accepted"] = self._advance(
                values["assigned"],
                rng.randint(5, 90),
                cap,
            )
            values["updated"] = values["accepted"]

        if current_order >= 2:
            values["processing"] = self._advance(
                values["accepted"],
                rng.randint(10, 240),
                cap,
            )
            values["updated"] = values["processing"]

        if current_order >= 3:
            values["done"] = self._advance(
                values["processing"],
                rng.randint(30, 2880),
                cap,
            )
            values["updated"] = values["done"]

        if current_order >= 4:
            values["pending_close"] = self._advance(
                values["done"],
                rng.randint(15, 720),
                cap,
            )
            values["updated"] = values["pending_close"]

        if current_order >= 5:
            close_base = values["pending_close"] or values["done"]
            values["closed"] = self._advance(
                close_base,
                rng.randint(30, 4320),
                cap,
            )
            values["updated"] = values["closed"]

        return values

    def _advance(
        self,
        value: datetime | None,
        minutes: int,
        cap: datetime,
    ) -> datetime:
        if value is None:
            return cap

        result = value + timedelta(minutes=max(1, minutes))
        return min(result, cap)

    def _build_status_timeline(
        self,
        current_status: TicketStatus,
        statuses: list[TicketStatus],
        times: dict[str, datetime | None],
    ) -> list[tuple[TicketStatus, datetime]]:
        by_stage: dict[str, TicketStatus] = {}

        for status in statuses:
            stage = self._status_stage(status)
            by_stage.setdefault(stage, status)

        current_stage = self._status_stage(current_status)
        result: list[tuple[TicketStatus, datetime]] = []

        def append_status(
            status: TicketStatus | None,
            at: datetime | None,
        ) -> None:
            if status is None or at is None:
                return
            if result and result[-1][0].pk == status.pk:
                return
            result.append((status, at))

        append_status(by_stage.get("created"), times.get("created"))

        if current_stage == "cancelled":
            append_status(by_stage.get("accepted"), times.get("accepted"))
            append_status(current_status, times.get("cancelled"))
            return result

        order = {
            "created": 0,
            "accepted": 1,
            "processing": 2,
            "done": 3,
            "pending_close": 4,
            "closed": 5,
            "other": 1,
        }
        current_order = order.get(current_stage, 1)

        if current_order >= 1:
            append_status(by_stage.get("accepted"), times.get("accepted"))
        if current_order >= 2:
            append_status(by_stage.get("processing"), times.get("processing"))
        if current_order >= 3:
            done_status = (
                current_status
                if current_stage == "done"
                else by_stage.get("done")
            )
            append_status(done_status, times.get("done"))
        if current_order >= 4:
            pending_status = (
                current_status
                if current_stage == "pending_close"
                else by_stage.get("pending_close")
            )
            append_status(
                pending_status,
                times.get("pending_close") or times.get("done"),
            )
        if current_order >= 5:
            append_status(current_status, times.get("closed"))

        if not result or result[-1][0].pk != current_status.pk:
            append_status(
                current_status,
                times.get(current_stage)
                or times.get("updated")
                or times["created"],
            )

        return result

    def _rebuild_related_data(
        self,
        *,
        ticket: Ticket,
        status: TicketStatus,
        statuses: list[TicketStatus],
        timeline_times: dict[str, datetime | None],
        assigned_employee: Employee,
        all_employees: list[Employee],
        assigned_user: User,
        created_by_user: User,
        supervisor_user: User | None,
        branch: Branch,
        unit: OrganizationUnit | None,
        priority: TicketPriority,
        sla_policy: Any | None,
        customer: Customer | None,
        scenario: dict[str, Any],
        tags: list[Tag],
        all_users: list[User],
        rng: random.Random,
    ) -> None:
        TicketProcessLog.objects.filter(ticket=ticket).delete()
        TicketAssignment.objects.filter(ticket=ticket).delete()
        TicketUpdateLog.objects.filter(ticket=ticket).delete()
        TicketResponse.objects.filter(ticket=ticket).delete()
        TicketComment.objects.filter(ticket=ticket).delete()
        TicketActivityLog.objects.filter(ticket=ticket).delete()
        TicketAttachment.objects.filter(ticket=ticket).delete()
        TicketFeedback.objects.filter(ticket=ticket).delete()
        TicketTag.objects.filter(ticket=ticket).delete()
        TicketFollower.objects.filter(ticket=ticket).delete()

        # Check if reassignment / transfer occurred mid-way (35% probability)
        has_reassignment = len(all_employees) > 1 and rng.random() < 0.35
        initial_employee = (
            rng.choice([e for e in all_employees if e.pk != assigned_employee.pk])
            if has_reassignment
            else assigned_employee
        )

        initial_assign_time = timeline_times["assigned"]
        transfer_time = (
            self._advance(initial_assign_time, rng.randint(15, 120), timeline_times.get("updated") or initial_assign_time)
            if has_reassignment
            else None
        )

        # 1. TicketAssignment history
        if has_reassignment and transfer_time:
            TicketAssignment.objects.create(
                ticket=ticket,
                from_branch=branch,
                to_branch=initial_employee.branch or branch,
                from_organization_unit=None,
                to_organization_unit=unit,
                from_employee=None,
                to_employee=initial_employee,
                assigned_by_user=created_by_user,
                assigned_at=initial_assign_time,
                unassigned_at=transfer_time,
                is_current=False,
                transfer_reason="Tiếp nhận và phân công ban đầu.",
                note="Phân công ban đầu cho nhân viên ca trước.",
                created_at=initial_assign_time,
            )

            TicketAssignment.objects.create(
                ticket=ticket,
                from_branch=initial_employee.branch or branch,
                to_branch=assigned_employee.branch or branch,
                from_organization_unit=unit,
                to_organization_unit=unit,
                from_employee=initial_employee,
                to_employee=assigned_employee,
                assigned_by_user=supervisor_user or assigned_user,
                assigned_at=transfer_time,
                unassigned_at=None,
                is_current=True,
                transfer_reason=rng.choice(TRANSFER_REASON_OPTIONS),
                note="Điều phối lại ticket cho nhân viên phụ trách trực tiếp.",
                created_at=transfer_time,
            )
        else:
            TicketAssignment.objects.create(
                ticket=ticket,
                from_branch=branch,
                to_branch=assigned_employee.branch or branch,
                from_organization_unit=None,
                to_organization_unit=unit,
                from_employee=None,
                to_employee=assigned_employee,
                assigned_by_user=created_by_user,
                assigned_at=initial_assign_time,
                unassigned_at=None,
                is_current=True,
                transfer_reason=rng.choice(TRANSFER_REASON_OPTIONS),
                note="Phân công trực tiếp cho nhân viên xử lý.",
                created_at=initial_assign_time,
            )

        # 2. Activity logs: CREATE & INITIAL ASSIGNMENT
        TicketActivityLog.objects.create(
            ticket=ticket,
            action_type="CREATE",
            action_name="Tạo mới ticket",
            old_value=None,
            new_value=status.status_code,
            created_by_user=created_by_user,
            created_at=timeline_times["created"],
            note="Ticket tiếp nhận qua kênh giao tiếp với khách hàng.",
        )

        TicketActivityLog.objects.create(
            ticket=ticket,
            action_type="ASSIGN_EMPLOYEE",
            action_name="Phân công nhân viên xử lý",
            old_value=None,
            new_value=initial_employee.employee_code,
            created_by_user=created_by_user,
            created_at=initial_assign_time,
            note=f"Phân công cho nhân viên {initial_employee.full_name}.",
        )

        # 3. Update logs: Initial Assignment
        TicketUpdateLog.objects.create(
            ticket=ticket,
            action_type="ASSIGN_EMPLOYEE",
            from_status=None,
            to_status=None,
            from_organization_unit=None,
            to_organization_unit=unit,
            from_branch=branch,
            to_branch=assigned_employee.branch or branch,
            from_employee=None,
            to_employee=initial_employee,
            old_priority=None,
            new_priority=priority,
            old_sla_policy=None,
            new_sla_policy=sla_policy,
            note="Ghi nhận phân công nhân viên phụ trách.",
            created_by_user=created_by_user,
            created_at=initial_assign_time,
        )

        # Log field edit / update info log if reassigned
        if has_reassignment and transfer_time:
            TicketUpdateLog.objects.create(
                ticket=ticket,
                action_type="TRANSFER_EMPLOYEE",
                from_status=None,
                to_status=None,
                from_organization_unit=unit,
                to_organization_unit=unit,
                from_branch=initial_employee.branch or branch,
                to_branch=assigned_employee.branch or branch,
                from_employee=initial_employee,
                to_employee=assigned_employee,
                old_priority=priority,
                new_priority=priority,
                old_sla_policy=sla_policy,
                new_sla_policy=sla_policy,
                note=f"Điều chuyển ticket từ {initial_employee.full_name} sang {assigned_employee.full_name}.",
                created_by_user=supervisor_user or assigned_user,
                created_at=transfer_time,
            )

            TicketActivityLog.objects.create(
                ticket=ticket,
                action_type="TRANSFER_EMPLOYEE",
                action_name="Điều chuyển nhân viên phụ trách",
                old_value=initial_employee.employee_code,
                new_value=assigned_employee.employee_code,
                created_by_user=supervisor_user or assigned_user,
                created_at=transfer_time,
                note="Thay đổi nhân viên theo phân công ca trực.",
            )

        # 4. Detailed Status Timeline and Process Logs (Thời gian quản lý)
        timeline = self._build_status_timeline(
            current_status=status,
            statuses=statuses,
            times=timeline_times,
        )

        for item_index, (timeline_status, start_at) in enumerate(timeline):
            end_at = (
                timeline[item_index + 1][1]
                if item_index + 1 < len(timeline)
                else (timeline_times.get("updated") or timezone.now())
            )

            duration_minutes = max(
                1,
                int((end_at - start_at).total_seconds() // 60),
            )

            TicketProcessLog.objects.create(
                ticket=ticket,
                status=timeline_status,
                employee=assigned_employee,
                user=assigned_user,
                start_at=start_at,
                end_at=end_at,
                duration_minutes=duration_minutes,
                note=f"Thời gian xử lý ở trạng thái {timeline_status.status_name}.",
                created_at=start_at,
            )

            if item_index == 0:
                continue

            previous_status = timeline[item_index - 1][0]
            action_type = "UPDATE_STATUS"

            if self._status_stage(timeline_status) == "closed":
                action_type = "CLOSE"
            elif self._status_stage(timeline_status) == "cancelled":
                action_type = "CANCEL"

            TicketUpdateLog.objects.create(
                ticket=ticket,
                action_type=action_type,
                from_status=previous_status,
                to_status=timeline_status,
                from_organization_unit=unit,
                to_organization_unit=unit,
                from_branch=assigned_employee.branch or branch,
                to_branch=assigned_employee.branch or branch,
                from_employee=assigned_employee,
                to_employee=assigned_employee,
                old_priority=priority,
                new_priority=priority,
                old_sla_policy=sla_policy,
                new_sla_policy=sla_policy,
                handling_solution=ticket.handling_solution,
                send_survey=(
                    self._status_stage(timeline_status) == "closed"
                    and rng.random() < 0.75
                ),
                note=f"Cập nhật trạng thái ticket sang {timeline_status.status_name}.",
                created_by_user=(
                    supervisor_user or assigned_user
                    if action_type in {"CLOSE", "CANCEL"}
                    else assigned_user
                ),
                created_at=start_at,
            )

            TicketActivityLog.objects.create(
                ticket=ticket,
                action_type=action_type,
                action_name=f"Chuyển trạng thái: {timeline_status.status_name}",
                old_value=previous_status.status_code,
                new_value=timeline_status.status_code,
                created_by_user=assigned_user,
                created_at=start_at,
                note=f"Ghi nhận cập nhật tiến độ xử lý sang {timeline_status.status_name}.",
            )

        # 5. Field edit log (Simulate editing priority or notes mid-way)
        if rng.random() < 0.50:
            edit_time = self._advance(timeline_times["assigned"], rng.randint(20, 180), timeline_times.get("updated") or timeline_times["assigned"])
            TicketUpdateLog.objects.create(
                ticket=ticket,
                action_type="UPDATE_INFO",
                from_status=status,
                to_status=status,
                from_organization_unit=unit,
                to_organization_unit=unit,
                from_branch=assigned_employee.branch or branch,
                to_branch=assigned_employee.branch or branch,
                from_employee=assigned_employee,
                to_employee=assigned_employee,
                old_priority=priority,
                new_priority=priority,
                old_sla_policy=sla_policy,
                new_sla_policy=sla_policy,
                handling_solution=ticket.handling_solution,
                note=rng.choice(FIELD_UPDATE_NOTES),
                created_by_user=assigned_user,
                created_at=edit_time,
            )

        # 6. Ticket Comments (1-3 comments per ticket)
        comment_count = rng.randint(1, 3)
        for comment_index in range(comment_count):
            comment_at = self._advance(
                timeline_times["assigned"],
                rng.randint(10, 480) + (comment_index * 30),
                timeline_times.get("updated") or timeline_times["assigned"],
            )
            comment_user = assigned_user if comment_index % 2 == 0 else (supervisor_user or assigned_user)
            TicketComment.objects.create(
                ticket=ticket,
                comment_content=rng.choice(COMMENT_OPTIONS),
                is_internal=rng.random() < 0.75,
                created_by_user=comment_user,
                created_at=comment_at,
            )

        # 7. Ticket Response
        stage = self._status_stage(status)
        if stage in {"done", "pending_close", "closed"}:
            response_at = (
                timeline_times.get("done")
                or timeline_times.get("updated")
                or timeline_times["assigned"]
            )
            TicketResponse.objects.create(
                ticket=ticket,
                response_content=(
                    ticket.final_response
                    or rng.choice(scenario["responses"])
                ),
                response_content_html=None,
                responded_by_user=assigned_user,
                responded_at=response_at,
                created_at=response_at,
            )

        # 8. Attachments
        if rng.random() < 0.35:
            uploaded_at = self._advance(
                timeline_times["assigned"],
                rng.randint(5, 180),
                timeline_times.get("updated") or timeline_times["assigned"],
            )
            extension = rng.choice(["png", "jpg", "pdf"])
            TicketAttachment.objects.create(
                ticket=ticket,
                file_name=f"dinh_kem_{ticket.ticket_code.lower()}.{extension}",
                file_url=(
                    f"https://example.invalid/attachments/"
                    f"{ticket.ticket_code.lower()}.{extension}"
                ),
                file_type=(
                    "application/pdf"
                    if extension == "pdf"
                    else f"image/{'jpeg' if extension == 'jpg' else 'png'}"
                ),
                file_size=rng.randint(35_000, 2_500_000),
                uploaded_by_user=created_by_user,
                uploaded_at=uploaded_at,
            )

        # 9. Customer Feedback Survey
        if stage == "closed" and rng.random() < 0.80:
            sent_at = timeline_times.get("closed")
            responded = rng.random() < 0.85
            responded_at = (
                self._advance(
                    sent_at,
                    rng.randint(20, 1440),
                    self._execution_cap(sent_at.date()),
                )
                if responded and sent_at
                else None
            )
            rating_score = rng.choices(
                [1, 2, 3, 4, 5],
                weights=[2, 5, 12, 35, 46],
                k=1,
            )[0] if responded else None

            feedback = TicketFeedback.objects.create(
                ticket=ticket,
                customer=customer,
                survey_sent=True,
                survey_status="RESPONDED" if responded else "SENT",
                rating_score=rating_score,
                rating_note=(
                    rng.choice(
                        [
                            "Nhân viên hỗ trợ rất nhiệt tình, phản hồi nhanh chóng.",
                            "Khách hàng hoàn toàn hài lòng với kết quả xử lý.",
                            "Cần rút ngắn hơn nữa thời gian trao đổi ban đầu.",
                            "Nội dung phản hồi rõ ràng, dễ hiểu.",
                            "Rất cảm ơn bộ phận CCC đã tra soát kịp thời.",
                        ]
                    )
                    if responded
                    else None
                ),
                sent_at=sent_at,
                responded_at=responded_at,
            )
            self._set_timestamp_fields(
                model=TicketFeedback,
                object_id=feedback.pk,
                created_at=sent_at or timeline_times["created"],
                updated_at=responded_at or sent_at or timeline_times["created"],
            )

        # 10. Tags & Followers
        if tags and rng.random() < 0.45:
            selected_tags = rng.sample(
                tags,
                k=min(len(tags), rng.randint(1, 2)),
            )
            for tag in selected_tags:
                TicketTag.objects.get_or_create(
                    ticket=ticket,
                    tag=tag,
                    defaults={
                        "created_by_user": assigned_user,
                        "created_at": timeline_times["assigned"],
                    },
                )

        follower_candidates = [
            user for user in all_users if user.pk != assigned_user.pk
        ]
        if follower_candidates and rng.random() < 0.40:
            follower = rng.choice(follower_candidates)
            TicketFollower.objects.get_or_create(
                ticket=ticket,
                user=follower,
                defaults={
                    "followed_at": timeline_times["assigned"],
                },
            )

    def _set_timestamp_fields(
        self,
        *,
        model,
        object_id: int,
        created_at: datetime,
        updated_at: datetime,
    ) -> None:
        field_names = {field.name for field in model._meta.get_fields()}
        updates = {}

        if "created_at" in field_names:
            updates["created_at"] = created_at
        if "updated_at" in field_names:
            updates["updated_at"] = updated_at

        if updates:
            model.objects.filter(pk=object_id).update(**updates)