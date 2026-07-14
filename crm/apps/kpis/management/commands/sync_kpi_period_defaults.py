from django.core.management.base import BaseCommand
from django.db import transaction

from apps.kpis.defaults import DEFAULT_KPI_GROUPS, DEFAULT_KPI_PERIOD_METRICS
from apps.kpis.models import (
    KpiGroup,
    KpiMetricDefinition,
    KpiPeriod,
    KpiPeriodMetric,
)
from apps.kpis.services import create_kpi_audit_log, serialize_model_basic


class Command(BaseCommand):
    help = "Đồng bộ cấu hình KPI mặc định mới vào một kỳ KPI đã tồn tại."

    def add_arguments(self, parser):
        parser.add_argument("period_code", type=str)

    @transaction.atomic
    def handle(self, *args, **options):
        period_code = options["period_code"]

        period = KpiPeriod.objects.get(period_code=period_code)

        synced_group_codes = []
        synced_metric_codes = []

        for group_item in DEFAULT_KPI_GROUPS:
            old_group = KpiGroup.objects.filter(
                period=period,
                group_code=group_item["group_code"],
            ).first()

            old_data = serialize_model_basic(old_group) if old_group else None

            group, created = KpiGroup.objects.update_or_create(
                period=period,
                group_code=group_item["group_code"],
                defaults={
                    "group_name": group_item["group_name"],
                    "group_type": group_item["group_type"],
                    "weight_percent": group_item["weight_percent"],
                    "sort_order": group_item["sort_order"],
                    "is_active": True,
                },
            )

            synced_group_codes.append(group.group_code)

            create_kpi_audit_log(
                period=period,
                object_type="KpiGroup",
                object_id=group.id,
                action_type="CREATE" if created else "UPDATE",
                changed_by_user=None,
                old_data=old_data,
                new_data=serialize_model_basic(group),
                note="Đồng bộ cấu hình nhóm KPI mặc định.",
            )

        KpiGroup.objects.filter(period=period).exclude(
            group_code__in=synced_group_codes
        ).update(
            is_active=False,
            weight_percent=0,
        )

        for metric_item in DEFAULT_KPI_PERIOD_METRICS:
            group = KpiGroup.objects.get(
                period=period,
                group_code=metric_item["group_code"],
            )

            definition, _ = KpiMetricDefinition.objects.update_or_create(
                metric_code=metric_item["definition_code"],
                defaults={
                    "metric_name": metric_item["metric_name"],
                    "description": metric_item.get("work_description", ""),
                    "input_type": metric_item["input_type"],
                    "formula_key": metric_item["formula_key"],
                    "unit": metric_item.get("unit", "SCORE"),
                    "is_active": True,
                },
            )

            old_metric = KpiPeriodMetric.objects.filter(
                period=period,
                metric_code=metric_item["metric_code"],
            ).first()

            old_data = serialize_model_basic(old_metric) if old_metric else None

            metric, created = KpiPeriodMetric.objects.update_or_create(
                period=period,
                metric_code=metric_item["metric_code"],
                defaults={
                    "group": group,
                    "metric_definition": definition,
                    "metric_name": metric_item["metric_name"],
                    "kpi_type": metric_item["kpi_type"],
                    "input_type": metric_item["input_type"],
                    "formula_key": metric_item["formula_key"],
                    "work_description": metric_item.get("work_description", ""),
                    "measurement_formula": metric_item.get("measurement_formula", ""),
                    "target_text": metric_item.get("target_text", ""),
                    "frequency": metric_item.get("frequency", ""),
                    "weight_percent": metric_item["weight_percent"],
                    "target_value": metric_item.get("target_value"),
                    "description": metric_item.get("work_description", ""),
                    "sort_order": metric_item.get("sort_order", 0),
                    "is_active": True,
                },
            )

            synced_metric_codes.append(metric.metric_code)

            create_kpi_audit_log(
                period=period,
                object_type="KpiPeriodMetric",
                object_id=metric.id,
                action_type="CREATE" if created else "UPDATE",
                changed_by_user=None,
                old_data=old_data,
                new_data=serialize_model_basic(metric),
                note="Đồng bộ cấu hình chỉ tiêu KPI mặc định.",
            )

        KpiPeriodMetric.objects.filter(period=period).exclude(
            metric_code__in=synced_metric_codes
        ).update(
            is_active=False,
            weight_percent=0,
        )

        period.validate_weight_configuration()

        self.stdout.write(
            self.style.SUCCESS(
                f"Synced KPI default config for period {period.period_code}"
            )
        )