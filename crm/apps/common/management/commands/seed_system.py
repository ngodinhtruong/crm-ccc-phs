from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Iterable

from django.core.management import call_command, get_commands
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor


@dataclass(frozen=True)
class SeedStep:
    command: str
    description: str
    required: bool = True


# Thứ tự được sắp theo phụ thuộc dữ liệu:
# 1) Chi nhánh trước nhân viên.
# 2) Master khách hàng và ticket trước SLA/ticket demo.
# 3) Quyền Sale Admin trước danh mục Sale Admin.
# 4) Danh mục External Error trước widget phụ thuộc danh mục.
SYSTEM_SEED_STEPS: tuple[SeedStep, ...] = (
    SeedStep(
        "seed_branches",
        "Khởi tạo chi nhánh",
    ),
    SeedStep(
        "seed_employee",
        "Khởi tạo hồ sơ nhân viên theo chi nhánh",
    ),
    SeedStep(
        "seed_customer_master",
        "Khởi tạo danh mục khách hàng",
    ),
    SeedStep(
        "seed_ticket_master",
        "Khởi tạo danh mục Ticket",
    ),
    SeedStep(
        "seed_sla_master",
        "Khởi tạo danh mục và chính sách SLA",
    ),
    SeedStep(
        "seed_sa_permissions",
        "Khởi tạo quyền cho Sale Admin",
    ),
    SeedStep(
        "seed_sa_record_master",
        "Khởi tạo danh mục bản ghi Sale Admin",
    ),
    SeedStep(
        "seed_kpi_defaults",
        "Khởi tạo cấu hình KPI mặc định",
    ),
    SeedStep(
        "seed_external_error",
        "Khởi tạo nhóm và mã lỗi hệ thống",
    ),
    SeedStep(
        "seed_external_error_causes",
        "Khởi tạo nhóm nguyên nhân lỗi",
    ),
    SeedStep(
        "seed_external_error_widgets",
        "Khởi tạo widget dashboard lỗi",
    ),
    SeedStep(
        "seed_external_error_cause_widgets",
        "Khởi tạo widget dashboard nguyên nhân",
    ),
)

DEMO_SEED_STEPS: tuple[SeedStep, ...] = (
    SeedStep(
        "seed_tickets_2026",
        "Tạo dữ liệu Ticket giả năm 2026",
    ),
)


class Command(BaseCommand):
    help = (
        "Chạy toàn bộ seed dữ liệu hệ thống theo đúng thứ tự phụ thuộc. "
        "Mặc định không tạo dữ liệu Ticket giả."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-demo-tickets",
            action="store_true",
            help="Chạy thêm seed_tickets_2026 sau khi hoàn tất dữ liệu hệ thống.",
        )
        parser.add_argument(
            "--skip",
            action="append",
            default=[],
            metavar="COMMAND",
            help=(
                "Bỏ qua một command cụ thể. Có thể truyền nhiều lần, ví dụ: "
                "--skip seed_employee --skip seed_kpi_defaults."
            ),
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Chỉ hiển thị thứ tự thực thi, không ghi dữ liệu.",
        )
        parser.add_argument(
            "--continue-on-error",
            action="store_true",
            help=(
                "Tiếp tục seed các bước sau khi một bước thất bại. "
                "Mặc định hệ thống dừng ngay để tránh dữ liệu phụ thuộc bị thiếu."
            ),
        )

    def handle(self, *args, **options):
        self._ensure_migrations_are_applied()

        steps = list(SYSTEM_SEED_STEPS)
        if options["with_demo_tickets"]:
            steps.extend(DEMO_SEED_STEPS)

        skipped = set(options["skip"])
        available_commands = get_commands()

        unknown_skips = skipped.difference(step.command for step in steps)
        if unknown_skips:
            raise CommandError(
                "Command trong --skip không nằm trong danh sách seed: "
                + ", ".join(sorted(unknown_skips))
            )

        runnable_steps = [
            step
            for step in steps
            if step.command not in skipped
        ]

        self._validate_commands(runnable_steps, available_commands)
        self._print_plan(runnable_steps, skipped, options["dry_run"])

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING(
                    "\nDry-run hoàn tất, chưa có dữ liệu nào được thay đổi."
                )
            )
            return

        started_at = time.perf_counter()
        completed: list[str] = []
        failed: list[tuple[str, str]] = []

        for index, step in enumerate(runnable_steps, start=1):
            self.stdout.write("")
            self.stdout.write(
                self.style.MIGRATE_HEADING(
                    f"[{index}/{len(runnable_steps)}] {step.description}"
                )
            )
            self.stdout.write(f"Command: python manage.py {step.command}")

            step_started_at = time.perf_counter()

            try:
                # Mỗi seed được bao trong một transaction riêng.
                # Nếu một bước lỗi, dữ liệu chưa hoàn tất của bước đó được rollback,
                # còn các bước đã chạy thành công trước đó vẫn được giữ lại.
                with transaction.atomic():
                    call_command(step.command)

                elapsed = time.perf_counter() - step_started_at
                completed.append(step.command)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Hoàn tất {step.command} trong {elapsed:.2f} giây."
                    )
                )
            except Exception as exc:
                elapsed = time.perf_counter() - step_started_at
                message = f"{type(exc).__name__}: {exc}"
                failed.append((step.command, message))

                self.stderr.write(
                    self.style.ERROR(
                        f"Thất bại {step.command} sau {elapsed:.2f} giây: "
                        f"{message}"
                    )
                )

                if not options["continue_on_error"]:
                    self._print_summary(
                        completed=completed,
                        failed=failed,
                        total_seconds=time.perf_counter() - started_at,
                    )
                    raise CommandError(
                        "Seed hệ thống đã dừng tại "
                        f"'{step.command}'. Sửa lỗi rồi chạy lại command."
                    ) from exc

        self._print_summary(
            completed=completed,
            failed=failed,
            total_seconds=time.perf_counter() - started_at,
        )

        if failed:
            raise CommandError(
                "Seed hoàn tất nhưng còn command thất bại: "
                + ", ".join(command for command, _ in failed)
            )

        self.stdout.write(
            self.style.SUCCESS(
                "\nĐã seed toàn bộ dữ liệu hệ thống theo đúng thứ tự."
            )
        )

    def _ensure_migrations_are_applied(self) -> None:
        executor = MigrationExecutor(connection)
        targets = executor.loader.graph.leaf_nodes()
        migration_plan = executor.migration_plan(targets)

        if not migration_plan:
            return

        pending = [
            f"{migration.app_label}.{migration.name}"
            for migration, _backwards in migration_plan
        ]

        preview = ", ".join(pending[:10])
        if len(pending) > 10:
            preview += f", ... và {len(pending) - 10} migration khác"

        raise CommandError(
            "Database còn migration chưa áp dụng: "
            f"{preview}. Hãy chạy 'python manage.py migrate' trước."
        )

    @staticmethod
    def _validate_commands(
        steps: Iterable[SeedStep],
        available_commands: dict[str, str],
    ) -> None:
        missing = [
            step.command
            for step in steps
            if step.required and step.command not in available_commands
        ]

        if missing:
            raise CommandError(
                "Không tìm thấy management command: "
                + ", ".join(missing)
                + ". Kiểm tra INSTALLED_APPS và thư mục "
                "management/commands."
            )

    def _print_plan(
        self,
        steps: list[SeedStep],
        skipped: set[str],
        dry_run: bool,
    ) -> None:
        title = "KẾ HOẠCH SEED HỆ THỐNG"
        if dry_run:
            title += " (DRY-RUN)"

        self.stdout.write(self.style.MIGRATE_HEADING(title))

        for index, step in enumerate(steps, start=1):
            self.stdout.write(
                f"{index:02d}. {step.command:<42} {step.description}"
            )

        if skipped:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "Bỏ qua: " + ", ".join(sorted(skipped))
                )
            )

    def _print_summary(
        self,
        *,
        completed: list[str],
        failed: list[tuple[str, str]],
        total_seconds: float,
    ) -> None:
        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("KẾT QUẢ"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Thành công: {len(completed)} command"
            )
        )

        for command in completed:
            self.stdout.write(f"  ✓ {command}")

        if failed:
            self.stderr.write(
                self.style.ERROR(f"Thất bại: {len(failed)} command")
            )
            for command, message in failed:
                self.stderr.write(f"  ✗ {command}: {message}")

        self.stdout.write(f"Tổng thời gian: {total_seconds:.2f} giây")
