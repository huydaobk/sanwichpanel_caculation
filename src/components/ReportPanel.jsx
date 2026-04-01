import React from 'react';
import { 
    Calculator, Save, RotateCcw, Download, Printer, Copy,
    ChevronDown, ChevronUp, Maximize2, Minimize2, Settings, Plus, X, List, Eye, Settings2, BarChart2
} from 'lucide-react';

const ReportPanel = (props) => {
    const { config, setConfig, results, setResults, handleInputChange, activeTab } = props;
    // Add missing props here later

    return (
        <div id="tab-report" className={activeTab === 'report' ? 'block' : 'hidden'}>
          <div className="w-full mx-auto bg-white p-8 shadow-lg print:shadow-none print:w-full print:max-w-none report-sheet">
            <ReportHeader />
            <ExecutiveSummaryPanel results={results} compareSummary={results.compareSummary} />
            <AssumptionsAndLimitationsPanel results={results} />

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-2 uppercase flex items-center gap-2">
                <Settings size={14} /> 1. Thông số đầu vào
              </h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex justify-between"><span>Loại panel:</span> <b>{config.panelType === 'external' ? 'Vách ngoài' : config.panelType === 'internal' ? 'Vách trong' : 'Tấm trần'}</b></div>
                <div className="flex justify-between"><span>Độ dày lõi:</span> <b>{config.coreThickness} mm</b></div>
                <div className="flex justify-between"><span>Tôn mặt (Ngoài/Trong):</span> <b>{config.skinOut} / {config.skinIn} mm</b></div>
                <div className="flex justify-between"><span>Bề rộng panel:</span> <b>{config.panelWidth} mm</b></div>
                <div className="flex justify-between"><span>Cường độ thép (Fy):</span> <b>{config.steelYield} MPa</b></div>
                <div className="flex justify-between"><span>Tỷ trọng lõi:</span> <b>{config.coreDensity} kg/m3</b></div>
                <div className="flex justify-between"><span>Cường độ cắt lõi:</span> <b>{config.coreShearStrength} MPa</b></div>
                <div className="flex justify-between"><span>Mô đun cắt lõi Gc:</span> <b>{config.coreShearModulus} MPa</b></div>
                <div className="flex justify-between"><span>Mô đun nén lõi Ec:</span> <b>{config.compressiveModulus} MPa</b></div>
                <div className="flex justify-between"><span>Hệ số kappa:</span> <b>{config.kappaShear}</b></div>
                <div className="flex justify-between"><span>Chế độ kiểm tra wrinkling:</span> <b>{getModeLabel(results.wrinklingMode, WRINKLING_MODE_LABELS)}</b></div>
                <div className="flex justify-between"><span>Phân phối nội lực:</span> <b>{getModeLabel(results.redistributionMode, REDISTRIBUTION_MODE_LABELS)}</b></div>
                <div className="flex justify-between"><span>Tải trọng gió/áp suất:</span> <b>{config.windPressure} kPa ({getModeLabel(config.windDirection, WIND_DIRECTION_LABELS)})</b></div>
                <div className="flex justify-between"><span>Chênh lệch nhiệt độ:</span> <b>{Math.abs(config.tempOut - config.tempIn)} °C</b></div>
                <div className="flex justify-between"><span>Hệ số nhiệt γT:</span> <b>{config.gammaF_thermal}</b></div>
                <div className="flex justify-between"><span>Sơ đồ nhịp:</span> <b>{config.spans.join(' + ')} m</b></div>
                <div className="flex justify-between"><span>Bề rộng gối đỡ:</span> <b>{config.supportWidths.join(' + ')} mm</b></div>
                {config.panelType !== 'ceiling' && (
                  <div className="flex justify-between"><span>Khoảng cách vít:</span> <b>{config.screwSpacing} mm</b></div>
                )}
                <div className="flex justify-between"><span>Giới hạn độ võng:</span> <b>L/{results.limitDenom}</b></div>
                {config.panelType === 'ceiling' && (
                  <div className="flex justify-between"><span>Chế độ tải phân bố:</span> <b>{results.distributedLoadMode === 'per-span' ? 'Theo từng nhịp' : 'Một giá trị chung'}</b></div>
                )}
                {config.panelType === 'ceiling' && results.distributedLoadMode === 'per-span' && (
                  <div className="col-span-2 rounded border border-sky-200 bg-sky-50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs font-bold text-sky-800">TÓM TẮT TẢI THEO TỪNG NHỊP</div>
                      <div className="text-[10px] font-semibold text-sky-700">Đang dùng dữ liệu per-span để tính nội lực</div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="text-[11px] text-slate-700">qG theo nhịp: <b>{formatSpanLoadSummary(results.qDeadBySpan_kPa).join(' · ')}</b></div>
                      <div className="text-[11px] text-slate-700">qQ theo nhịp: <b>{formatSpanLoadSummary(results.qLiveBySpan_kPa).join(' · ')}</b></div>
                    </div>
                  </div>
                )}

                {(config.panelType === 'ceiling' || (config.panelType === 'internal' && config.internalWallType === 'cold_storage')) && (
                  <div className="flex justify-between"><span>Hệ số từ biến (φ/φb):</span> <b>{config.creepFactor} / {config.creepFactorBending}</b></div>
                )}
              </div>
            </div>

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-2 uppercase flex items-center gap-2">
                <BookOpen size={14} /> 2. Cơ sở & Phương pháp tính toán
              </h3>

              <div className="text-xs text-justify space-y-2 text-slate-700">
                <h4 className="font-bold text-blue-800">2.1 Cơ sở lý thuyết</h4>
                <ul className="list-disc list-inside pl-2">
                  <li><strong>Tiêu chuẩn áp dụng:</strong> TCVN 2737:2023, EN 14509:2013.</li>
                  <li><strong>Phân tích:</strong> Dầm liên tục (FEM Timoshenko), xét biến dạng cắt & nhiệt; ULS có tái phân phối nội lực khi vượt M_Rd.</li>
                  {(config.panelType === 'ceiling' || (config.panelType === 'internal' && config.internalWallType === 'cold_storage')) && (
                    <li><strong>Từ biến lõi (creep):</strong> GA_long = GA_inst/(1+φ), EI_long giảm theo φb (nếu nhập). Trần xét cho tải lâu dài (dead + tải treo), kho lạnh xét cho toàn tải SLS.</li>
                  )}
                </ul>

                <h4 className="font-bold text-blue-800 mt-2">2.2 Đặc trưng tiết diện (Section Properties)</h4>
                <table className="w-full text-[10px] border-collapse border border-gray-300 mt-1 font-mono">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-1 text-left">Thông số</th>
                      <th className="border p-1 text-left">Công thức</th>
                      <th className="border p-1 text-left">Thay số</th>
                      <th className="border p-1 text-center">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-1">Chiều cao hiệu dụng e</td>
                      <td className="border p-1">e = d<sub>C</sub> + (t<sub>F1</sub> + t<sub>F2</sub>)/2</td>
                      <td className="border p-1">{results.dC} + ({results.tF1} + {results.tF2})/2</td>
                      <td className="border p-1 text-center font-bold">{results.e.toFixed(2)} mm</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích mặt ngoài A<sub>f1</sub></td>
                      <td className="border p-1">A<sub>f1</sub> = B × t<sub>F1</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.tF1}</td>
                      <td className="border p-1 text-center font-bold">{results.Af1.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích mặt trong A<sub>f2</sub></td>
                      <td className="border p-1">A<sub>f2</sub> = B × t<sub>F2</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.tF2}</td>
                      <td className="border p-1 text-center font-bold">{results.Af2.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích lõi A<sub>c</sub></td>
                      <td className="border p-1">A<sub>c</sub> = B × d<sub>C</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.dC}</td>
                      <td className="border p-1 text-center font-bold">{results.Ac.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Độ cứng uốn EI</td>
                      <td className="border p-1">EI = E<sub>f</sub>·A<sub>f1</sub>·A<sub>f2</sub>/(A<sub>f1</sub>+A<sub>f2</sub>)·e²</td>
                      <td className="border p-1">210000×{results.Af1.toFixed(0)}×{results.Af2.toFixed(0)}/({results.Af1.toFixed(0)}+{results.Af2.toFixed(0)})×{results.e.toFixed(1)}²</td>
                      <td className="border p-1 text-center font-bold">{(results.EI / 1e9).toFixed(2)}×10⁹ Nmm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Độ cứng cắt GA</td>
                      <td className="border p-1">GA = G<sub>c</sub> × A<sub>c</sub></td>
                      <td className="border p-1">{config.coreShearModulus} × {results.Ac.toFixed(0)}</td>
                      <td className="border p-1 text-center font-bold">{(results.GA_inst / 1000).toFixed(0)} kN</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Mô-men quán tính quy đổi I<sub>eq</sub></td>
                      <td className="border p-1">I<sub>eq</sub> = EI / E<sub>f</sub></td>
                      <td className="border p-1">{(results.EI / 1e9).toFixed(2)}×10⁹ / 210000</td>
                      <td className="border p-1 text-center font-bold">{(results.I_eq).toFixed(0)} mm⁴</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Khoảng cách lớn nhất z<sub>max</sub></td>
                      <td className="border p-1">z<sub>max</sub> = max(z<sub>out</sub>, z<sub>in</sub>)</td>
                      <td className="border p-1">—</td>
                      <td className="border p-1 text-center font-bold">{results.zMax.toFixed(2)} mm</td>
                    </tr>
                  </tbody>
                </table>

                <h4 className="font-bold text-blue-800 mt-3">2.3 Tổ hợp tải trọng</h4>
                <table className="w-full text-[10px] border-collapse border border-gray-300 mt-1 font-mono">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-1 text-left">Nhóm tải</th>
                      <th className="border p-1 text-center">Giá trị</th>
                      <th className="border p-1 text-center">Đơn vị</th>
                      <th className="border p-1 text-center">γ (ULS)</th>
                      <th className="border p-1 text-center">γ (SLS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.panelType === 'ceiling' && (
                      <>
                        <tr>
                          <td className="border p-1">Tự trọng q<sub>G</sub></td>
                          <td className="border p-1 text-center">{results.qDead_kPa.toFixed(4)}</td>
                          <td className="border p-1 text-center">kPa</td>
                          <td className="border p-1 text-center">{results.gammaG}</td>
                          <td className="border p-1 text-center">1.0</td>
                        </tr>
                        <tr>
                          <td className="border p-1">Hoạt tải q<sub>Q</sub></td>
                          <td className="border p-1 text-center">{results.qLive_kPa.toFixed(2)}</td>
                          <td className="border p-1 text-center">kPa</td>
                          <td className="border p-1 text-center">{results.gammaQ}</td>
                          <td className="border p-1 text-center">1.0</td>
                        </tr>
                      </>
                    )}
                    <tr>
                      <td className="border p-1">Gió/Áp suất q<sub>W</sub></td>
                      <td className="border p-1 text-center">{Math.abs(results.qWind_kPa).toFixed(2)}</td>
                      <td className="border p-1 text-center">kPa</td>
                      <td className="border p-1 text-center">2.1</td>
                      <td className="border p-1 text-center">1.0</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Chênh lệch nhiệt ΔT</td>
                      <td className="border p-1 text-center">{Math.abs(results.dT_deg)}</td>
                      <td className="border p-1 text-center">°C</td>
                      <td className="border p-1 text-center">{results.gammaThermal}</td>
                      <td className="border p-1 text-center">1.0</td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-2 bg-blue-50 rounded border border-blue-200 mt-2 text-[10px] font-mono">
                  {results.distributedLoadMode === 'per-span' ? (
                    <>
                      <p><strong>Chế độ tải phân bố:</strong> đang dùng <b>theo từng nhịp</b>; mỗi nhịp có bộ qG/qQ riêng trước khi lập tổ hợp.</p>
                      <div className="overflow-x-auto mt-2">
                        <table className="w-full border-collapse border border-blue-200 text-[10px]">
                          <thead className="bg-blue-100">
                            <tr>
                              <th className="border border-blue-200 p-1 text-left">Nhịp</th>
                              <th className="border border-blue-200 p-1 text-center">qG (kPa)</th>
                              <th className="border border-blue-200 p-1 text-center">qQ (kPa)</th>
                              <th className="border border-blue-200 p-1 text-center">qSLS = qG + qQ</th>
                              <th className="border border-blue-200 p-1 text-center">qULS = γG·qG + γQ·qQ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distributedLoadRows.map((row) => {
                              const tone = PER_SPAN_ROW_TONE[row.tone] || PER_SPAN_ROW_TONE.neutral;
                              return (
                                <tr key={row.spanLabel} className={tone.row}>
                                  <td className={`border border-blue-200 p-1 font-semibold ${tone.emphasis}`}>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span>{row.spanLabel}</span>
                                      {row.badges.map((badge) => {
                                        const badgeTone = PER_SPAN_ROW_TONE[badge.tone] || PER_SPAN_ROW_TONE.neutral;
                                        return (
                                          <span key={`${row.spanLabel}-${badge.label}`} className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${badgeTone.badge}`}>
                                            {badge.label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className={`border border-blue-200 p-1 text-center ${tone.cell}`}>{row.qG.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center ${tone.cell}`}>{row.qQ.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center font-semibold ${tone.emphasis}`}>{row.qSLS.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center font-semibold ${tone.emphasis}`}>{row.qULS.toFixed(3)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 rounded border border-blue-200 bg-white/70 p-2 space-y-1">
                        <div className="text-[10px] font-semibold text-blue-800">Nhịp nào nên kiểm tra lại</div>
                        <ul className="space-y-1">
                          {perSpanSummaryItems.map((item, idx) => {
                            const toneClass = item.tone === 'danger'
                              ? 'text-rose-700'
                              : item.tone === 'warning'
                                ? 'text-amber-700'
                                : item.tone === 'info'
                                  ? 'text-sky-700'
                                  : 'text-slate-700';
                            return (
                              <li key={`per-span-summary-${idx}`} className={`flex gap-2 text-[10px] leading-relaxed ${toneClass}`}>
                                <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-current" />
                                <span>{item.text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <p className="mt-2"><strong>Giá trị điều khiển đang dùng cho báo cáo tổng:</strong> q<sub>ULS,max</sub> = <b>{results.qULS_kPa.toFixed(3)} kPa</b>; q<sub>SLS,max</sub> = <b>{results.qSLS_kPa.toFixed(3)} kPa</b>.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Tổ hợp ULS:</strong> q<sub>ULS</sub> = {results.gammaG}×{results.qDead_kPa.toFixed(3)} + {results.gammaQ}×{results.qLive_kPa.toFixed(2)} + 2.1×{Math.abs(results.qWind_kPa).toFixed(2)} = <b>{results.qULS_kPa.toFixed(3)} kPa</b></p>
                      <p><strong>Tổ hợp SLS:</strong> q<sub>SLS</sub> = {results.qDead_kPa.toFixed(3)} + {results.qLive_kPa.toFixed(2)} + {Math.abs(results.qWind_kPa).toFixed(2)} = <b>{results.qSLS_kPa.toFixed(3)} kPa</b></p>
                    </>
                  )}
                  <p><strong>Mô-men nhiệt (ULS):</strong> M<sub>t</sub> = EI·α·ΔT·γ<sub>T</sub>/e = {(results.EI / 1e9).toFixed(2)}×10⁹ × 1.2×10⁻⁵ × {Math.abs(results.dT_deg)} × {results.gammaThermal} / {results.e.toFixed(1)} = <b>{results.Mt_ULS_kNm.toFixed(3)} kNm/m</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.4 Kiểm tra ứng suất uốn & wrinkling (ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Chế độ kiểm tra wrinkling:</strong> {getModeLabel(results.wrinklingMode, WRINKLING_MODE_LABELS)} {results.sigma_w_source ? `(nguồn: ${getModeLabel(results.sigma_w_source, WRINKLING_SOURCE_LABELS)})` : ''}</p>
                  {results.wrinklingDeclaredMissing && (
                    <p className="text-amber-700"><strong>Cảnh báo dữ liệu đầu vào:</strong> đã chọn chế độ khai báo trực tiếp nhưng thiếu ứng suất wrinkling hợp lệ; hệ thống đang fallback tạm sang <b>{getModeLabel(results.wrinklingFallbackMode, WRINKLING_MODE_LABELS)}</b>.</p>
                  )}
                  <p><strong>Ứng suất wrinkling xấp xỉ:</strong> σ<sub>w,approx</sub> = 0.5√(E<sub>f</sub>·E<sub>c</sub>·G<sub>c</sub>) = 0.5×√(210000×{results.compressiveModulus}×{config.coreShearModulus}) = <b>{results.sigma_w_approx.toFixed(1)} MPa</b></p>
                  <p className="text-slate-500"><strong>Ghi chú provenance approx:</strong> hệ số <b>0.5</b> và bộ biến <b>E<sub>f</sub>, E<sub>c</sub>, G<sub>c</sub></b> hiện đã được externalize là <b>xấp xỉ kỹ thuật nội bộ</b>; repo <b>chưa có citation trực tiếp</b> để nâng thành công thức source-backed.</p>
                  <p><strong>Ứng suất wrinkling khai báo:</strong> σ<sub>w,declared</sub> = <b>{results.sigma_w_declared.toFixed(1)} {results?.wrinklingMeta?.declaredInput?.unit || 'MPa'}</b></p>
                  <p><strong>Semantic giá trị khai báo:</strong> {results?.wrinklingMeta?.declaredInput?.basis || 'design-resistance'} / {results?.wrinklingMeta?.declaredInput?.sourceType || 'unknown'} {results?.wrinklingMeta?.declaredInput?.sourceRef ? `(ref: ${results.wrinklingMeta.declaredInput.sourceRef})` : ''}</p>
                  {results?.wrinklingMeta?.declaredInput?.productContext && (
                    <p><strong>Context sản phẩm:</strong> {results.wrinklingMeta.declaredInput.productContext}</p>
                  )}
                  {results?.wrinklingMeta?.declaredInput?.sourceNote && (
                    <p><strong>Ghi chú nguồn:</strong> {results.wrinklingMeta.declaredInput.sourceNote}</p>
                  )}
                  <p className="text-slate-500"><strong>Ghi chú provenance declared:</strong> khi chọn <b>Khai báo trực tiếp</b>, repo giữ con số MPa ở trạng thái <b>user-declared</b> trừ khi có đúng table/test/worksheet chứa giá trị đó. Repo hiện đã có thêm một vendor technical guide cấp product-family nêu rõ failure mode <b>“wrinkling of the face layer in the span and at an intermediate support”</b>, nên basis/source framing đỡ mơ hồ hơn; nhưng đợt hunt artifact hiện tại vẫn <b>chưa tìm được</b> vendor MPa table, test report, archived worksheet, hay product-manual numeric line đủ mạnh để nâng con số MPa declared này thành source-backed.</p>
                  <p><strong>Ứng suất wrinkling dùng trong kiểm tra:</strong> σ<sub>w</sub> = <b>{results.sigma_w.toFixed(1)} MPa</b></p>
                  <p><strong>Ứng suất thiết kế wrinkling:</strong> σ<sub>w,d</sub> = σ<sub>w</sub>/γ<sub>M,w</sub> = {results.sigma_w.toFixed(1)}/{results?.wrinklingMeta?.factorProvenance?.value || 1.2} = <b>{results.sigma_w_design.toFixed(1)} MPa</b></p>
                  <p className="text-slate-500"><strong>Ghi chú provenance γ<sub>M,w</sub>:</strong> repo hiện áp dụng γ<sub>M,w</sub> = <b>{results?.wrinklingMeta?.factorProvenance?.value || 1.2}</b> nhất quán, nhưng chưa source-link được giá trị này tới clause/vendor/worksheet chấp nhận.</p>
                  <p><strong>Thiết kế chảy:</strong> σ<sub>y,d</sub> = f<sub>y</sub>/γ<sub>M,y</sub> = {config.steelYield}/1.1 = <b>{results.sigma_y_design.toFixed(1)} MPa</b></p>
                  <p><strong>Giới hạn:</strong> {results?.effectiveWrinklingMode === 'yield-only'
                    ? <>σ<sub>limit</sub> = σ<sub>y,d</sub> = <b>{results.sigma_limit.toFixed(1)} MPa</b></>
                    : <>σ<sub>limit</sub> = min(σ<sub>w,d</sub>, σ<sub>y,d</sub>) = min({results.sigma_w_design.toFixed(1)}, {results.sigma_y_design.toFixed(1)}) = <b>{results.sigma_limit.toFixed(1)} MPa</b></>}</p>
                  <p><strong>Ứng suất tính toán (Nhịp):</strong> σ<sub>Ed</sub> = M<sub>Ed</sub>·z<sub>max</sub>/I<sub>eq</sub> = <b>{results.stress_span.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.bending * 100).toFixed(0)}%</b></p>
                  <p><strong>Ứng suất tính toán (Gối):</strong> σ<sub>Ed</sub> = <b>{results.stress_support.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.support * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.5 Kiểm tra lực cắt (ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Chế độ phân phối nội lực:</strong> {getModeLabel(results.redistributionMode, REDISTRIBUTION_MODE_LABELS)} {results.redistributionEnabled ? '(đã bật tái phân phối nội lực theo cơ chế khớp)' : '(chỉ dùng bao nội lực đàn hồi)'}</p>
                  <p><strong>Khả năng chịu cắt:</strong> V<sub>Rd</sub> = f<sub>Cv</sub>·A<sub>c</sub>/γ<sub>M</sub> = {config.coreShearStrength}×{results.Ac.toFixed(0)}/1.25 = <b>{(results.V_Rd / 1000).toFixed(2)} kN/m</b></p>
                  <p><strong>Lực cắt tính toán:</strong> V<sub>Ed,max</sub> = <b>{(results.maxShear / 1000).toFixed(2)} kN/m</b></p>
                  <p><strong>Tỷ lệ:</strong> V<sub>Ed</sub>/V<sub>Rd</sub> = {(results.maxShear / 1000).toFixed(2)}/{(results.V_Rd / 1000).toFixed(2)} = <b>{(results.ratios.shear * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.6 Kiểm tra độ võng (SLS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Giới hạn:</strong> w<sub>limit</sub> = L/{results.limitDenom} = {(Math.max(...config.spans) * 1000).toFixed(0)}/{results.limitDenom} = <b>{results.w_limit.toFixed(1)} mm</b></p>
                  <p><strong>Độ võng tính toán:</strong> w<sub>total</sub> = w<sub>mech</sub> + w<sub>thermal</sub> + w<sub>creep</sub> = <b>{results.maxDeflection.toFixed(1)} mm</b></p>
                  <p><strong>Tỷ lệ:</strong> w<sub>total</sub>/w<sub>limit</sub> = {results.maxDeflection.toFixed(1)}/{results.w_limit.toFixed(1)} = <b>{(results.ratios.deflection * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.7 Kiểm tra lực nhổ / liên kết chống nhổ (ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Phạm vi kiểm tra uplift:</strong> {results.upliftEnabled ? 'Đang bật vì panel không phải ceiling và có screwStrength > 0.' : 'Không áp dụng cho case hiện tại.'}</p>
                  <p><strong>screwStrength khai báo:</strong> <b>{Number(results?.technicalTransparency?.uplift?.declaredInput?.value || 0).toFixed(2)} {results?.technicalTransparency?.uplift?.declaredInput?.unit || 'kN'}</b> / mỗi vít</p>
                  <p><strong>Semantic giá trị khai báo:</strong> {results?.technicalTransparency?.uplift?.declaredInput?.basis || 'design-resistance-per-fastener'} / {results?.technicalTransparency?.uplift?.declaredInput?.sourceType || 'unknown'} {results?.technicalTransparency?.uplift?.declaredInput?.sourceRef ? `(ref: ${results.technicalTransparency.uplift.declaredInput.sourceRef})` : ''}</p>
                  {results?.technicalTransparency?.uplift?.declaredInput?.fastenerContext && (
                    <p><strong>Context vít/liên kết:</strong> {results.technicalTransparency.uplift.declaredInput.fastenerContext}</p>
                  )}
                  {results?.technicalTransparency?.uplift?.declaredInput?.sourceNote && (
                    <p><strong>Ghi chú nguồn:</strong> {results.technicalTransparency.uplift.declaredInput.sourceNote}</p>
                  )}
                  {!results?.technicalTransparency?.uplift?.declaredInput?.isSourceDocumented && results.upliftEnabled && (
                    <p className="text-slate-500"><strong>Ghi chú provenance screwStrength:</strong> hiện <b>chưa có documented source</b> cho con số kN đang dùng, nên repo chỉ coi đây là <b>user-declared per-fastener resistance</b>, chưa nâng thành source-backed capacity. T3 artifact hunt chỉ tìm được vendor installation guidance xác nhận fastening phải được dimension case-by-case theo <b>fastener-manufacturer instructions / research results</b>; đây là acquisition-path context, không phải numeric authority cho chính giá trị kN.</p>
                  )}
                  <p><strong>Quy tắc đếm vít hiện hành:</strong> {results?.technicalTransparency?.uplift?.declaredInput?.spacingMeaning || results?.technicalTransparency?.uplift?.inputSchema?.spacingMeaning || 'spacing across panelWidth for simplified count estimate'} → screwCount = <b>{results.screwCount}</b></p>
                  <p><strong>Sức kháng thiết kế uplift:</strong> T<sub>Rd</sub> = screwStrength × screwCount / γ<sub>M,screw</sub> = {Number(results?.technicalTransparency?.uplift?.declaredInput?.value || 0).toFixed(2)} × {results.screwCount} / {results?.technicalTransparency?.uplift?.factor?.value || 1.33} = <b>{(results.T_Rd_Worst / 1000).toFixed(2)} kN</b></p>
                  <p className="text-slate-500"><strong>Ghi chú provenance γ<sub>M,screw</sub> & count rule:</strong> repo externalize rõ <b>γ<sub>M,screw</sub></b> và rule <b>round(panelWidth / screwSpacing)</b>, nhưng cả hai hiện vẫn là <b>implementation-visible source gap</b>; chưa có clause/vendor worksheet được attach để nâng authority.</p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.8 Trường hợp chi phối</h4>
                <div className="p-2 bg-amber-50 rounded border border-amber-200 mt-1 text-[10px] font-mono space-y-1">
                  {governingCaseRows.map(({ caseKey, item }) => (
                    <p key={caseKey}>
                      <strong>{caseKey === CAPACITY_GOVERNING_CASE_KEYS.OVERALL ? 'Tổng thể' : getCapacityLabel(caseKey, caseKey)}:</strong> {item.label} — {(item.ratio * 100).toFixed(0)}%
                    </p>
                  ))}
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.9 Kết quả tổng hợp</h4>
                <table className="w-full text-xs border-collapse border border-gray-300 mt-1">
                  <thead className="bg-gray-100 font-bold text-gray-700">
                    <tr>
                      <th className="border p-2 text-left">Hạng mục</th>
                      <th className="border p-2 text-center">S_d</th>
                      <th className="border p-2 text-center">R_d</th>
                      <th className="border p-2 text-center">S/R</th>
                      <th className="border p-2 text-center">Kết luận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capacityReportRows.map((row) => (
                      <tr key={row.key}>
                        <td className="border p-2">{row.label}</td>
                        <td className="border p-2 text-center">{row.demand}</td>
                        <td className="border p-2 text-center">{row.resistance}</td>
                        <td className={`border p-2 text-center font-bold ${row.ratio > 1 ? 'text-red-600' : 'text-green-600'}`}>{(row.ratio * 100).toFixed(0)}%</td>
                        <td className={`border p-2 text-center font-bold ${row.ratio <= 1 ? 'text-green-600' : 'text-red-600'}`}>{row.ratio <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-4 uppercase flex items-center gap-2">
                <Activity size={14} /> 3. Biểu đồ Nội lực & Chuyển vị
              </h3>

              <div className="flex flex-col gap-6">
                {/* ✅ Sơ đồ tính trong báo cáo */}
                <div className="border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">
                    {config.panelType === 'ceiling' ? 'Sơ đồ tính trần (X toàn dầm)' : 'Sơ đồ tính (tải + gối)'}
                  </h4>

                  {config.panelType === 'ceiling' ? (
                    <CeilingSchematic config={config} results={results} />
                  ) : (
                    <BeamDiagram
                      spansM={config.spans}
                      windDirection={config.windDirection}
                      windPressure={config.windPressure}
                    />
                  )}
                </div>

                {/* REPORT: DEFLECTION CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Chuyển vị [mm]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <ComposedChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="mm"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.deflectionTotal && (
                        <>
                          <ReferenceLine
                            x={results.extrema.deflectionTotal.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Lớn nhất: ${results.extrema.deflectionTotal.max.value.toFixed(1)} mm`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.deflectionTotal.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Nhỏ nhất: ${results.extrema.deflectionTotal.min.value.toFixed(1)} mm`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Line
                        type="monotone"
                        dataKey="deflectionWind"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name={config.panelType === 'ceiling' ? 'Cơ học (có creep)' : 'Gió'}
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="deflectionCreep"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        name="Từ biến (creep)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="deflectionThermal"
                        stroke="#ff7300"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Nhiệt"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      {/* ✅ Tổng: fill vùng về 0 */}
                      <Area
                        type="monotone"
                        dataKey="deflectionTotal"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.18}
                        baseValue={0}
                        name="Tổng"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="step"
                        dataKey="limitPlus"
                        stroke="red"
                        strokeWidth={1}
                        strokeDasharray="10 5"
                        name="Giới hạn (+)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="step"
                        dataKey="limitMinus"
                        stroke="red"
                        strokeWidth={1}
                        strokeDasharray="10 5"
                        name="Giới hạn (-)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: MOMENT CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Mô-men uốn [kNm]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <ComposedChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="kNm"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.moment && (
                        <>
                          <ReferenceLine
                            x={results.extrema.moment.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Lớn nhất: ${results.extrema.moment.max.value.toFixed(2)} kNm`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.moment.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Nhỏ nhất: ${results.extrema.moment.min.value.toFixed(2)} kNm`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Area
                        type="monotone"
                        dataKey="moment"
                        stroke="#ff7300"
                        fill="#fff7ed"
                        strokeWidth={1.5}
                        name="Mô-men"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: SHEAR CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Lực cắt [kN]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <AreaChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="kN"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.shear && (
                        <>
                          <ReferenceLine
                            x={results.extrema.shear.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Lớn nhất: ${results.extrema.shear.max.value.toFixed(2)} kN`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.shear.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Nhỏ nhất: ${results.extrema.shear.min.value.toFixed(2)} kN`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Area
                        type="linear"
                        dataKey="shear"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.25}
                        name="Lực Cắt"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: REACTION CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Biểu đồ phản lực gối (Reaction) [kN]</h4>
                  <div className="mb-2">
                    <ReactionLegend />
                  </div>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <BarChart
                      data={results.reactionData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis width={60} unit="kN" tick={{ fontSize: 10 }} tickMargin={6} />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                      <Bar dataKey="R_Ed" name="Phản lực" barSize={30} isAnimationActive={!printMode}>
                        {results.reactionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.status === 'fail' ? REACTION_FAIL_COLOR : REACTION_PASS_COLOR}
                          />
                        ))}
                      </Bar>

                      <Bar
                        dataKey="F_Rd"
                        name="Giới hạn"
                        fill={REACTION_LIMIT_COLOR}
                        stroke={REACTION_LIMIT_BORDER}
                        strokeDasharray="3 3"
                        barSize={30}
                        isAnimationActive={!printMode}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {compareModeEnabled && compareMetricRows.length > 0 && (
              <div className="mb-6 report-section">
                <h3 className="text-sm font-bold border-b border-gray-400 mb-3 uppercase flex items-center gap-2">
                  <Activity size={14} /> 4. So sánh phương án
                </h3>
                <div className="rounded border border-violet-200 bg-violet-50 p-3">
                  <div className="text-xs text-violet-900 mb-3">Bảng này gom ngắn gọn các chỉ tiêu quyết định để so 2–3 phương án song song, không thay flow báo cáo chi tiết của phương án đang mở.</div>
                  {results.compareSummary?.available && (
                    <div className="mb-3 grid gap-2 md:grid-cols-3 text-xs">
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Phương án nên đọc trước</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.bestVariantLabel || '—'}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.bestStatus === 'pass' ? 'Đạt' : 'Không đạt'} · {results.compareSummary.bestRatio != null ? formatRatioPercent(results.compareSummary.bestRatio) : '—'}{results.compareSummary.bestMarginPercent != null ? ` · margin ${results.compareSummary.bestMarginPercent.toFixed(1)}%` : ''}</div>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Tổng số phương án đạt</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.passCount}/{results.compareSummary.variantCount}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.allPass ? 'Tất cả phương án đều đạt.' : results.compareSummary.mixedStatus ? 'Có phương án đạt, có phương án không đạt.' : 'Chưa có phương án nào đạt hoàn toàn.'}</div>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Case chi phối của PA ưu tiên</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.bestGoverningLabel || '—'}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.rationale || 'Tóm tắt để chốt shortlist trước khi xem bảng chi tiết.'}</div>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs bg-white">
                      <thead>
                        <tr className="bg-violet-100 text-violet-950">
                          <th className="border border-violet-200 p-2 text-left">Chỉ tiêu</th>
                          {compareResults.map((variant) => (
                            <th key={`report-compare-${variant.id}`} className="border border-violet-200 p-2 text-left">{variant.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compareMetricRows.map((row) => (
                          <tr key={`report-row-${row.key}`}>
                            <td className="border border-violet-200 p-2 font-semibold text-slate-700">{row.label}</td>
                            {row.values.map((cell) => {
                              const toneClass = cell.tone === 'pass'
                                ? 'text-emerald-700'
                                : cell.tone === 'fail'
                                  ? 'text-rose-700'
                                  : cell.tone === 'muted'
                                    ? 'text-slate-400'
                                    : 'text-slate-800';
                              return (
                                <td key={`report-cell-${row.key}-${cell.variantId}`} className={`border border-violet-200 p-2 font-semibold ${cell.isBest ? 'bg-emerald-50/70' : ''} ${toneClass}`.trim()}>
                                  <div className="flex items-center gap-2">
                                    <span>{cell.value}</span>
                                    {cell.isBest && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Best</span>}
                                  </div>
                                  {cell.subValue && <div className="text-[10px] font-medium text-slate-500">{cell.subValue}</div>}
                                  {cell.diffHint && <div className="text-[10px] font-medium text-slate-500">{cell.diffHint}</div>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded border border-slate-200 report-section report-conclusion">
              <h3 className="text-sm font-bold uppercase mb-2 text-slate-700 flex items-center gap-2"><Info size={14} /> 5. Kết luận & khuyến nghị</h3>
              <div className="space-y-3">
                <div className={`font-bold text-sm ${results.status === 'pass' ? 'text-green-700' : 'text-red-700'}`}>
                  {results.status === 'pass' ? 'KẾT CẤU ĐẢM BẢO KHẢ NĂNG CHỊU LỰC' : 'KẾT CẤU KHÔNG ĐẠT YÊU CẦU - CẦN ĐIỀU CHỈNH'}
                </div>
                <TransparencyPanel results={results} />
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  {results.advice.map((item, i) => (<li key={i}>{item}</li>))}
                </ul>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
              <button
                type="button"
                onClick={handleExportPackage}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-2 font-bold text-emerald-800 shadow hover:bg-emerald-100 flex items-center gap-2 transition-colors"
              >
                <FileJson size={18} />Xuất result package JSON (release-stamped)
              </button>
              <button
                onClick={handlePrint}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-red-700 flex items-center gap-2 transition-colors"
              >
                <Printer size={20} />Xuất PDF / Lưu báo cáo
              </button>
            </div>

            <div className="mt-8 text-[10px] text-center text-slate-400 italic space-y-1">
              <div>Báo cáo được tạo tự động bởi phần mềm {APP_DISPLAY_NAME}.</div>
              <div>{buildReleaseStamp(resolvedAppVersion)} · channel: {resolvedReleaseChannel}</div>
            </div>
          </div>
        </div>

    );
};

export default ReportPanel;
