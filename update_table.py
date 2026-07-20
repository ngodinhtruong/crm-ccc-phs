import re

with open("crm-frontend/src/components/tickets/TicketListPage.tsx", "r") as f:
    content = f.read()

# 1. Replace <thead>...</thead>
thead_pattern = r'(\<table className="w-full min-w-\[2400px\] border-collapse text-left text-xs"\>\n\s*\<thead\>).*?(\</thead\>)'

new_thead = r'''<table className="w-full min-w-[2200px] border-collapse text-left text-xs">
            <thead>
              <tr className="h-10 border-b bg-white text-slate-700">
                <th className="w-[150px] px-3 font-semibold">Ngày tạo</th>
                <th className="w-[145px] px-3 font-semibold">Mã ticket</th>
                <th className="w-[180px] px-3 font-semibold">Phân loại</th>
                <th className="w-[180px] px-3 font-semibold">Danh mục</th>
                <th className="w-[180px] px-3 font-semibold">Khách hàng</th>
                <th className="w-[140px] px-3 font-semibold">Số TK</th>
                <th className="w-[140px] px-3 font-semibold">Di động</th>
                <th className="w-[140px] px-3 font-semibold">Email</th>
                <th className="w-[140px] px-3 font-semibold">Nguồn Ticket</th>
                <th className="w-[160px] px-3 font-semibold">Tình trạng</th>
                <th className="w-[180px] px-3 font-semibold">Giao cho</th>
                <th className="w-[180px] px-3 font-semibold">Mức độ ưu tiên</th>
                <th className="w-[180px] px-3 font-semibold">Tổng thời gian</th>
                <th className="w-[180px] px-3 font-semibold">Tổng thời gian xử lý</th>
              </tr>

              <tr className="border-b bg-[#f8fafc] align-top">
                <th className="px-2 py-2">
                  <ColumnDateRangeFilter
                    fromValue={tickets.createdFrom}
                    toValue={tickets.createdTo}
                    onFromChange={tickets.setCreatedFrom}
                    onToChange={tickets.setCreatedTo}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.ticketCode}
                    onChange={tickets.setTicketCode}
                    placeholder="Mã"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.classification}
                    onChange={tickets.setClassification}
                    options={tickets.filteredClassifications.map((item) => ({
                      label: item.classification_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.supportCategory}
                    onChange={tickets.setSupportCategory}
                    options={tickets.supportCategories.map((item) => ({
                      label: item.category_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.customerName}
                    onChange={tickets.setCustomerName}
                    placeholder="KH"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.accountNumber}
                    onChange={tickets.setAccountNumber}
                    placeholder="Số TK"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.customerPhone}
                    onChange={tickets.setCustomerPhone}
                    placeholder="Di động"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.customerEmail}
                    onChange={tickets.setCustomerEmail}
                    placeholder="Email"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.source}
                    onChange={tickets.setSource}
                    options={tickets.sources.map((item) => ({
                      label: item.source_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.currentStatus}
                    onChange={tickets.setCurrentStatus}
                    options={tickets.statuses.map((item) => ({
                      label: item.status_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnTextFilter
                    value={tickets.ownerUserName}
                    onChange={tickets.setOwnerUserName}
                    placeholder="Giao cho"
                  />
                </th>

                <th className="px-2 py-2">
                  <ColumnSelectFilter
                    value={tickets.priority}
                    onChange={tickets.setPriority}
                    options={tickets.priorities.map((item) => ({
                      label: item.priority_name,
                      value: String(item.id),
                    }))}
                  />
                </th>

                <th className="px-2 py-2"></th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>'''

content = re.sub(thead_pattern, new_thead, content, flags=re.DOTALL)

# 2. Replace tbody tr map contents and colSpan=16 -> colSpan=14
content = content.replace('colSpan={16}', 'colSpan={14}')

tbody_row_pattern = r'(<tr\s+key=\{item\.id\}\s+onClick=\{[^}]+\}\s+className=\{[^}]+\}\s+>\s+)(.*?)(</tr>)'
new_tbody_row = r'''<td className="px-3">{formatDate(item.created_at)}</td>

                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sky-600">
                            {item.ticket_code || `TICKET-${item.id}`}
                          </span>

                          <button
                            type="button"
                            title="Xem chi tiết ticket"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/tickets/${item.id}`);
                            }}
                            className="flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            <Eye size={12} />
                            Chi tiết
                          </button>
                        </div>
                      </td>

                      <td className="px-3">{item.classification_name || "-"}</td>

                      <td className="px-3">{item.support_category_name || "-"}</td>

                      <td className="px-3">{item.customer_name || "-"}</td>

                      <td className="px-3 font-semibold text-slate-700">
                        {item.display_account_number || item.customer_account_number || item.raw_account_number || "-"}
                      </td>

                      <td className="px-3">{item.customer_phone || "-"}</td>

                      <td className="px-3">{item.customer_email || "-"}</td>

                      <td className="px-3">{item.source_name || "-"}</td>

                      <td className="px-3">{item.status_name || "-"}</td>

                      <td className="px-3">
                        {item.assigned_employee_name || item.owner_user_name || "-"}
                      </td>

                      <td className="px-3">{item.priority_name || "-"}</td>

                      <td className="px-3 font-medium text-slate-600">
                        {formatDuration(item.total_duration_minutes)}
                      </td>

                      <td className="px-3 font-medium text-slate-600">
                        {formatDuration(item.processing_duration_minutes)}
                      </td>'''

content = re.sub(tbody_row_pattern, r'\1' + new_tbody_row + r'\n                    \3', content, flags=re.DOTALL)

with open("crm-frontend/src/components/tickets/TicketListPage.tsx", "w") as f:
    f.write(content)
