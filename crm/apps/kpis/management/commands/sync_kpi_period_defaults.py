from django.core.management.base import BaseCommand
from django.db import transaction

from apps.kpis.defaults import (
    DEFAULT_KPI_GROUPS,
    DEFAULT_KPI_PERIOD_METRICS,
    DEFAULT_KPI_PROFILES,
    DEFAULT_KPI_SECTIONS,
)
from apps.kpis.models import KpiGroup, KpiPeriod, KpiPeriodMetric, KpiProfile, KpiSection
from apps.kpis.services import create_kpi_audit_log, serialize_model_basic


class Command(BaseCommand):
    help = "Đồng bộ cấu hình KPI mặc định vào một kỳ KPI đã tồn tại theo profile SA/SA_SUP."

    def add_arguments(self, parser):
        parser.add_argument("period_code", type=str)
        parser.add_argument(
            "--profile-code",
            type=str,
            default=None,
            help="Chỉ sync một profile, ví dụ SA hoặc SA_SUP.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        period_code = options["period_code"]
        profile_code_filter = options.get("profile_code")
        period = KpiPeriod.objects.get(period_code=period_code)

        allowed_profile_codes = None
        if profile_code_filter:
            allowed_profile_codes = {profile_code_filter}

        synced_profile_codes = []
        profiles_by_code = {}

        for profile_item in DEFAULT_KPI_PROFILES:
            if allowed_profile_codes and profile_item["profile_code"] not in allowed_profile_codes:
                continue

            old_profile = KpiProfile.objects.filter(
                period=period,
                profile_code=profile_item["profile_code"],
            ).first()
            old_data = serialize_model_basic(old_profile) if old_profile else None

            profile, created = KpiProfile.objects.update_or_create(
                period=period,
                profile_code=profile_item["profile_code"],
                defaults={
                    "profile_name": profile_item["profile_name"],
                    "target_role_code": profile_item["target_role_code"],
                    "total_weight": profile_item.get("total_weight", "100.00"),
                    "sort_order": profile_item.get("sort_order", 0),
                    "is_active": True,
                },
            )
            profiles_by_code[profile.profile_code] = profile
            synced_profile_codes.append(profile.profile_code)

            create_kpi_audit_log(
                period=period,
                object_type="KpiProfile",
                object_id=profile.id,
                action_type="CREATE" if created else "UPDATE",
                changed_by_user=None,
                old_data=old_data,
                new_data=serialize_model_basic(profile),
                note="Đồng bộ bộ KPI mặc định.",
            )

        sections_by_key = {}
        synced_section_keys = []

        for section_item in DEFAULT_KPI_SECTIONS:
            if allowed_profile_codes and section_item["profile_code"] not in allowed_profile_codes:
                continue

            profile = profiles_by_code[section_item["profile_code"]]
            old_section = KpiSection.objects.filter(
                period=period,
                profile=profile,
                section_code=section_item["section_code"],
            ).first()
            old_data = serialize_model_basic(old_section) if old_section else None

            section, created = KpiSection.objects.update_or_create(
                period=period,
                profile=profile,
                section_code=section_item["section_code"],
                defaults={
                    "section_name": section_item["section_name"],
                    "weight_percent": section_item["weight_percent"],
                    "sort_order": section_item.get("sort_order", 0),
                    "is_active": True,
                },
            )
            sections_by_key[(profile.profile_code, section.section_code)] = section
            synced_section_keys.append((profile.profile_code, section.section_code))

            create_kpi_audit_log(
                period=period,
                object_type="KpiSection",
                object_id=section.id,
                action_type="CREATE" if created else "UPDATE",
                changed_by_user=None,
                old_data=old_data,
                new_data=serialize_model_basic(section),
                note="Đồng bộ phần KPI mặc định.",
            )

        groups_by_key = {}
        synced_group_keys = []

        for group_item in DEFAULT_KPI_GROUPS:
            if allowed_profile_codes and group_item["profile_code"] not in allowed_profile_codes:
                continue

            profile = profiles_by_code[group_item["profile_code"]]
            section = sections_by_key[(group_item["profile_code"], group_item["section_code"])]

            old_group = KpiGroup.objects.filter(
                period=period,
                profile=profile,
                group_code=group_item["group_code"],
            ).first()
            old_data = serialize_model_basic(old_group) if old_group else None

            group, created = KpiGroup.objects.update_or_create(
                period=period,
                profile=profile,
                group_code=group_item["group_code"],
                defaults={
                    "section": section,
                    "group_name": group_item["group_name"],
                    "group_type": group_item["group_type"],
                    "weight_percent": group_item["weight_percent"],
                    "sort_order": group_item.get("sort_order", 0),
                    "is_active": True,
                },
            )
            groups_by_key[(profile.profile_code, group.group_code)] = group
            synced_group_keys.append((profile.profile_code, group.group_code))

            create_kpi_audit_log(
                period=period,
                object_type="KpiGroup",
                object_id=group.id,
                action_type="CREATE" if created else "UPDATE",
                changed_by_user=None,
                old_data=old_data,
                new_data=serialize_model_basic(group),
                note="Đồng bộ nhóm KPI mặc định.",
            )

        synced_metric_keys = []

        for metric_item in DEFAULT_KPI_PERIOD_METRICS:
            if allowed_profile_codes and metric_item["profile_code"] not in allowed_profile_codes:
                continue

            profile = profiles_by_code[metric_item["profile_code"]]
            group = groups_by_key[(metric_item["profile_code"], metric_item["group_code"])]

            old_metric = KpiPeriodMetric.objects.filter(
                period=period,
                profile=profile,
                metric_code=metric_item["metric_code"],
            ).first()
            old_data = serialize_model_basic(old_metric) if old_metric else None

            metric, created = KpiPeriodMetric.objects.update_or_create(
                period=period,
                profile=profile,
                metric_code=metric_item["metric_code"],
                defaults={
                    "group": group,
                    "metric_name": metric_item["metric_name"],
                    "weight_percent": metric_item["weight_percent"],
                    "work_description": metric_item.get("work_description", ""),
                    "measurement_formula": metric_item.get("measurement_formula", ""),
                    "target_text": metric_item.get("target_text", ""),
                    "target_value": metric_item.get("target_value"),
                    "target_unit": metric_item.get("target_unit", ""),
                    "frequency": metric_item.get("frequency", ""),
                    "is_active": True,
                },
            )
            synced_metric_keys.append((profile.profile_code, metric.metric_code))

            create_kpi_audit_log(
                period=period,
                object_type="KpiPeriodMetric",
                object_id=metric.id,
                action_type="CREATE" if created else "UPDATE",
                changed_by_user=None,
                old_data=old_data,
                new_data=serialize_model_basic(metric),
                note="Đồng bộ KPI mặc định.",
            )

        for profile in profiles_by_code.values():
            KpiSection.objects.filter(period=period, profile=profile).exclude(
                section_code__in=[code for pcode, code in synced_section_keys if pcode == profile.profile_code]
            ).update(is_active=False, weight_percent=0)

            KpiGroup.objects.filter(period=period, profile=profile).exclude(
                group_code__in=[code for pcode, code in synced_group_keys if pcode == profile.profile_code]
            ).update(is_active=False, weight_percent=0)

            KpiPeriodMetric.objects.filter(period=period, profile=profile).exclude(
                metric_code__in=[code for pcode, code in synced_metric_keys if pcode == profile.profile_code]
            ).update(is_active=False, weight_percent=0)

            profile.validate_weight_configuration()

        self.stdout.write(self.style.SUCCESS(f"Synced KPI default config for period {period.period_code}"))
