import React from 'react';
import { 
    Calculator, Save, RotateCcw, Download, Printer, Copy,
    ChevronDown, ChevronUp, Maximize2, Minimize2, Settings, Plus, X, List, Eye, Settings2, BarChart2
} from 'lucide-react';

const InputPanel = (props) => {
    const { config, setConfig, results, setResults, handleInputChange, activeTab } = props;
    // Add missing props here later

    return (
        <div id="tab-input" className={activeTab === 'input' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-blue-700"><Settings size={20} /> 1. Sơ Đồ & Kích Thước</h2>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">Tên dự án</label>
                <input type="text" name="projectName" value={config.projectName} onChange={handleInputChange} className="w-full border p-2 rounded" />
              </div>

              <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                <div className="flex flex-wrap gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="external" checked={config.panelType === 'external'} onChange={handleInputChange} />
                    <span className="text-sm">Vách ngoài</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="internal" checked={config.panelType === 'internal'} onChange={handleInputChange} />
                    <span className="text-sm">Vách trong</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="ceiling" checked={config.panelType === 'ceiling'} onChange={handleInputChange} />
                    <span className="text-sm">Tấm trần</span>
                  </label>
                </div>

                {config.panelType === 'internal' && (
                  <div className="flex gap-4 mb-2 pl-4 border-l-2 border-blue-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="internalWallType" value="normal" checked={config.internalWallType === 'normal'} onChange={handleInputChange} />
                      <span className="text-xs">Thường</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="internalWallType" value="cold_storage" checked={config.internalWallType === 'cold_storage'} onChange={handleInputChange} />
                      <span className="text-xs">Kho lạnh</span>
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-blue-200">
                  <label className="text-xs font-bold">Giới hạn độ võng:</label>
                  <select
                    name="deflectionLimit"
                    value={config.deflectionLimit}
                    onChange={(e) => setConfig({ ...config, deflectionLimit: parseInt(e.target.value, 10) })}
                    className="text-sm border rounded p-1"
                  >
                    <option value="100">L/100</option>
                    <option value="150">L/150</option>
                    <option value="200">L/200</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm block font-medium">Nhịp (m):</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    {config.spans.map((s, i) => (
                      <input key={i} type="number" value={s} onChange={(e) => handleSpanChange(i, e.target.value)} className="w-16 border p-1 rounded text-center" />
                    ))}
                    <button onClick={addSpan} className="text-green-600 font-bold px-2">+</button>
                    <button onClick={removeSpan} className="text-red-600 font-bold px-2">-</button>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="text-sm block font-medium mb-1">Rộng gối (mm):</label>
                  <div className="flex gap-2 flex-wrap">
                    {config.supportWidths.map((w, i) => {
                      const check = results.reactionData && results.reactionData[i];
                      const isFail = check?.status === 'fail';
                      return (
                        <div key={i} className="flex flex-col w-20 relative group">
                          <span className="text-[10px] text-gray-500 text-center uppercase font-bold">Gối {i}</span>
                          <div className="relative">
                            <input
                              type="number"
                              value={w}
                              onChange={(e) => handleSupportWidthChange(i, e.target.value)}
                              className={`w-full border rounded p-1 text-center text-sm outline-none transition-colors duration-200 ${isFail ? 'border-red-500 bg-red-100 text-red-900 font-bold shadow-sm' : 'border-gray-300 focus:border-blue-500'}`}
                            />
                            {isFail && (
                              <div className="absolute top-full left-0 w-full mt-1 z-10 hidden group-hover:block">
                                <div className="bg-red-600 text-white text-[10px] rounded p-1 shadow-lg text-center">
                                  Cần &gt; {Math.ceil(check.reqWidth)}mm
                                </div>
                                <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-red-600 absolute -top-1 left-1/2 -translate-x-1/2"></div>
                              </div>
                            )}
                            {isFail && <AlertCircle size={12} className="text-red-500 absolute top-1.5 right-1 pointer-events-none" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm block font-bold">Độ dày lõi (mm):</label>
                  <div className="flex flex-wrap gap-2">
                    {[40, 50, 60, 75, 80, 100, 125, 150, 200].map(v => (
                      <button
                        key={v}
                        onClick={() => setCoreThickness(v)}
                        className={`border px-2 py-1 rounded text-sm ${config.coreThickness === v ? 'bg-blue-600 text-white' : ''}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-orange-600"><Thermometer size={20} /> 2. Thông số kỹ thuật</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs block">Tôn ngoài (mm)</label><input type="number" step="0.05" name="skinOut" value={config.skinOut} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Tôn trong (mm)</label><input type="number" step="0.05" name="skinIn" value={config.skinIn} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold">Bề rộng panel (mm)</label><input type="number" step="10" name="panelWidth" value={config.panelWidth} onChange={handlePanelWidthChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Nhiệt độ ngoài (°C)</label><input type="number" name="tempOut" value={config.tempOut} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Nhiệt độ trong (°C)</label><input type="number" name="tempIn" value={config.tempIn} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số nhiệt γT</label><input type="number" step="0.1" name="gammaF_thermal" value={config.gammaF_thermal} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold">Áp lực gió (kPa)</label><input type="number" step="0.1" name="windPressure" value={config.windPressure} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold text-red-600">Thép Fy (MPa)</label><input type="number" name="steelYield" value={config.steelYield} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Cường độ cắt lõi (MPa)</label><input type="number" step="0.01" name="coreShearStrength" value={config.coreShearStrength} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Mô đun cắt lõi Gc (MPa)</label><input type="number" step="0.1" name="coreShearModulus" value={config.coreShearModulus} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Mô đun nén lõi Ec (MPa)</label><input type="number" step="0.1" name="compressiveModulus" value={config.compressiveModulus} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số kappa cắt</label><input type="number" step="0.05" name="kappaShear" value={config.kappaShear} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Chế độ kiểm tra nhăn</label><select name="wrinklingMode" value={config.wrinklingMode} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="declared">Khai báo trực tiếp</option><option value="approx">Xấp xỉ kỹ thuật</option><option value="yield-only">Theo giới hạn chảy</option></select></div>
                <div className="col-span-2 rounded border border-amber-200 bg-amber-50/40 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs block">Ứng suất nhăn khai báo</label>
                      <input type="number" step="0.1" name="wrinklingStress" value={config.wrinklingStress} onChange={handleInputChange} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                      <label className="text-xs block">Đơn vị / basis hiển thị</label>
                      <input type="text" name="wrinklingStressUnit" value={config.wrinklingStressUnit} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="MPa" />
                    </div>
                    <div>
                      <label className="text-xs block">Semantic của giá trị khai báo</label>
                      <select name="wrinklingStressBasis" value={config.wrinklingStressBasis} onChange={handleInputChange} className="w-full border p-2 rounded">
                        <option value="design-resistance">Giá trị thiết kế dùng trực tiếp</option>
                        <option value="characteristic-resistance">Giá trị đặc trưng</option>
                        <option value="test-result">Kết quả thử nghiệm</option>
                        <option value="vendor-table">Giá trị từ bảng vendor/datasheet</option>
                        <option value="user-note">Ghi chú nội bộ / user note</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs block">Loại nguồn</label>
                      <select name="wrinklingStressSourceType" value={config.wrinklingStressSourceType} onChange={handleInputChange} className="w-full border p-2 rounded">
                        <option value="unknown">Chưa rõ nguồn</option>
                        <option value="vendor">Vendor datasheet/manual</option>
                        <option value="test">Test report</option>
                        <option value="worksheet">Worksheet nội bộ đã lưu</option>
                        <option value="manual">Nhập tay / nhớ lại</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs block">Nguồn tham chiếu / product context</label>
                    <input type="text" name="wrinklingStressSourceRef" value={config.wrinklingStressSourceRef} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Ví dụ: datasheet XYZ rev.B / worksheet 2025-11 / PIR 50 mm" />
                  </div>
                  <div>
                    <label className="text-xs block">Ghi chú nguồn / giả định</label>
                    <textarea name="wrinklingStressSourceNote" value={config.wrinklingStressSourceNote} onChange={handleInputChange} className="w-full border p-2 rounded min-h-[72px]" placeholder="Ghi rõ nếu đây là characteristic value, kết quả test chưa quy đổi, hoặc note nội bộ chưa có citation cứng." />
                  </div>
                  <div>
                    <label className="text-xs block">Context sản phẩm áp dụng</label>
                    <input type="text" name="wrinklingStressProductContext" value={config.wrinklingStressProductContext} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Panel line / core density / thickness / facing..." />
                  </div>
                  <p className="text-[11px] text-slate-600">Giá trị này hiện được hiểu là <b>khai báo sức kháng/ứng suất wrinkling theo nguồn do người dùng cung cấp</b>. Hệ thống vẫn tính như cũ, nhưng sẽ mang theo basis + provenance để tránh nhập một con số mơ hồ.</p>
                  <p className="text-[11px] text-slate-500">Repo hiện đã gắn được <b>guidance cấp product-family</b> từ vendor technical guide có nêu “wrinkling of the face layer…”, nên nếu nhập theo panel family tương ứng hãy ưu tiên khai rõ <b>basis</b> + <b>source ref</b>. Tuy vậy, sau đợt artifact hunt hiện tại repo vẫn <b>chưa có vendor table/test/worksheet/manual line chứa con số MPa cụ thể</b> cho declared path này, nên giá trị số vẫn chỉ được coi là source-backed khi chính table/test/worksheet chứa đúng giá trị đó được đính kèm.</p>
                  {config.wrinklingMode === 'declared' && !(Number(config.wrinklingStress) > 0) && (
                    <p className="text-[11px] text-amber-700">Thiếu ứng suất wrinkling khai báo hợp lệ; báo cáo sẽ gắn cờ thiếu dữ liệu và fallback tạm sang kiểm tra theo giới hạn chảy.</p>
                  )}
                </div>
                <div><label className="text-xs block">Chế độ phân phối nội lực</label><select name="redistributionMode" value={config.redistributionMode} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="elastic">Đàn hồi</option><option value="simplified">Đơn giản hóa</option></select></div>
                {config.panelType !== 'ceiling' && (
                  <>
                    <div><label className="text-xs block">Khả năng chịu kéo vít (kN)</label><input type="number" step="0.1" name="screwStrength" value={config.screwStrength} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="text-xs block">Bước vít (mm)</label><input type="number" step="10" name="screwSpacing" value={config.screwSpacing} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="text-xs block">Basis sức kháng vít</label><select name="screwStrengthBasis" value={config.screwStrengthBasis} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="design-resistance-per-fastener">Design resistance / mỗi vít</option><option value="characteristic-resistance-per-fastener">Characteristic resistance / mỗi vít</option><option value="vendor-allowable-per-fastener">Vendor allowable / mỗi vít</option><option value="test-result-per-fastener">Test result / mỗi vít</option><option value="user-note-per-fastener">User note / mỗi vít</option></select></div>
                    <div><label className="text-xs block">Loại nguồn sức kháng vít</label><select name="screwStrengthSourceType" value={config.screwStrengthSourceType} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="unknown">Chưa rõ nguồn</option><option value="vendor">Vendor datasheet / manual</option><option value="schedule">Project fastening schedule</option><option value="test">Test report / lab sheet</option><option value="worksheet">Archived worksheet / calc note</option><option value="manual">Manual user entry</option></select></div>
                    <div><label className="text-xs block">Đơn vị hiển thị</label><input type="text" name="screwStrengthUnit" value={config.screwStrengthUnit} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="kN" /></div>
                    <div><label className="text-xs block">Source ref</label><input type="text" name="screwStrengthSourceRef" value={config.screwStrengthSourceRef} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Ví dụ: fastener datasheet ABC / schedule rev.2 / worksheet uplift-01" /></div>
                    <div className="col-span-2"><label className="text-xs block">Fastener / application context</label><input type="text" name="screwStrengthFastenerContext" value={config.screwStrengthFastenerContext} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Fastener type / substrate / sheet thickness / embedment / washer / support line..." /></div>
                    <div className="col-span-2"><label className="text-xs block">Source note</label><textarea name="screwStrengthSourceNote" value={config.screwStrengthSourceNote} onChange={handleInputChange} className="w-full border p-2 rounded min-h-[72px]" placeholder="Ghi rõ nếu đây là characteristic value, vendor allowable chưa quy đổi, hoặc note nội bộ chưa có citation cứng." /></div>
                    <div className="col-span-2"><label className="text-xs block">Diễn giải spacing-to-count (tuỳ chọn)</label><input type="text" name="screwStrengthSpacingMeaning" value={config.screwStrengthSpacingMeaning} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Mặc định: spacing across panelWidth for simplified count estimate" /></div>
                    <div className="col-span-2 text-[11px] text-slate-600 space-y-1"><p>Giá trị <b>screwStrength</b> hiện được hiểu là <b>sức kháng nhổ / pull-out khai báo trên mỗi vít</b>. Hệ thống giữ nguyên công thức uplift hiện có, nhưng sẽ mang theo basis + provenance để tránh nhập một con số kN mơ hồ.</p><p className="text-slate-500">Repo hiện <b>chưa có documented datasheet/schedule/test/worksheet</b> chứng minh sẵn con số kN cụ thể cho từng case. Nếu chưa gắn <b>source ref</b> hoặc <b>source note</b>, báo cáo sẽ nói rõ đây vẫn là <b>user-declared fastener resistance</b>. Quy tắc <b>round(panelWidth / screwSpacing)</b> và <b>γM,screw</b> cũng đang được exposed minh bạch như source-gap/provisional metadata, không phải cited rule.</p></div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="flex items-center gap-4 text-sm mt-2">
                    <input type="radio" name="windDirection" value="pressure" checked={config.windDirection === 'pressure'} onChange={handleInputChange} /> Gió đẩy
                    <input type="radio" name="windDirection" value="suction" checked={config.windDirection === 'suction'} onChange={handleInputChange} /> Gió hút
                  </label>
                </div>

                {config.panelType === 'ceiling' && (
                  <div className="col-span-2 mt-2 bg-emerald-50 p-3 rounded border border-emerald-200 space-y-2">
                    <div className="text-xs font-bold text-emerald-800">TẢI TRỌNG TÁC DỤNG LÊN TRẦN</div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 rounded border border-emerald-200 bg-white/70 p-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                          <input
                            type="checkbox"
                            checked={config.enableSpanDistributedLoads === true}
                            onChange={(e) => setConfig(prev => ({ ...prev, enableSpanDistributedLoads: e.target.checked }))}
                          />
                          Nhập tải phân bố riêng cho từng nhịp
                        </label>
                        <div className="text-[10px] text-gray-600 mt-1">
                          Tắt tuỳ chọn này để dùng 1 bộ qG/qQ chung như flow cũ. Bật để khai báo qG và qQ riêng cho từng nhịp ở bảng bên dưới.
                        </div>
                      </div>

                      <div>
                        <label className="text-xs block font-bold">Tĩnh tải</label>
                        <select
                          name="deadLoadMode"
                          value={config.deadLoadMode}
                          onChange={handleInputChange}
                          className="w-full border rounded p-1 text-sm"
                        >
                          <option value="auto">Tự động (tự trọng panel)</option>
                          <option value="manual">Nhập tay (kPa)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs block font-bold">Hoạt tải (kPa)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="liveLoad_kPa"
                          value={config.liveLoad_kPa}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                      </div>

                      {config.deadLoadMode === 'manual' && (
                        <div className="col-span-2">
                          <label className="text-xs block font-bold">Tĩnh tải nhập tay (kPa)</label>
                          <input
                            type="number"
                            step="0.01"
                            name="deadLoadManual_kPa"
                            value={config.deadLoadManual_kPa}
                            onChange={handleInputChange}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                      )}

                      <div className="col-span-2 space-y-2">
                        {loadWorkflowGuardrails.map((item) => (
                          <div key={item.id} className={`rounded border p-3 ${LOAD_WARNING_TONE[item.tone] || LOAD_WARNING_TONE.info}`}>
                            <div className="text-xs font-semibold">{item.title}</div>
                            <div className="mt-1 text-[11px] leading-relaxed">{item.message}</div>
                          </div>
                        ))}
                      </div>

                      {config.enableSpanDistributedLoads === true && (
                        <div className="col-span-2 rounded border border-emerald-200 bg-white/80 p-3 space-y-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <div className="text-xs font-bold text-emerald-800">BẢNG TẢI PHÂN BỐ THEO TỪNG NHỊP (kPa)</div>
                              <div className="text-[10px] text-gray-600 mt-1">Mỗi dòng là một nhịp độc lập. qG = tĩnh tải, qQ = hoạt tải dùng cho nhịp đó.</div>
                            </div>
                            <div className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">Mode đang bật: Theo từng nhịp</div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold text-gray-600">
                            <div>Nhịp</div>
                            <div>Chiều dài</div>
                            <div>Tĩnh tải qG</div>
                            <div>Hoạt tải qQ</div>
                          </div>
                          {config.spans.map((span, idx) => {
                            const rawDead = config.deadLoadBySpan_kPa?.[idx];
                            const rawLive = config.liveLoadBySpan_kPa?.[idx];
                            const deadMissing = rawDead === '' || rawDead === null || typeof rawDead === 'undefined';
                            const liveMissing = rawLive === '' || rawLive === null || typeof rawLive === 'undefined';
                            const qG = Number(rawDead || 0);
                            const qQ = Number(rawLive || 0);
                            const isNegative = qG < 0 || qQ < 0;
                            const isZeroDead = qG === 0;
                            const isEmptySpan = qG === 0 && qQ === 0;
                            const rowTone = isNegative ? 'rose' : (deadMissing || liveMissing || isZeroDead) ? 'amber' : 'emerald';
                            const rowClass = rowTone === 'rose'
                              ? 'border-rose-200 bg-rose-50/80'
                              : rowTone === 'amber'
                                ? 'border-amber-200 bg-amber-50/80'
                                : 'border-emerald-100 bg-emerald-50/40';
                            const inputClass = rowTone === 'rose'
                              ? 'border-rose-300 bg-white text-rose-900 focus:border-rose-400 focus:ring-rose-100'
                              : rowTone === 'amber'
                                ? 'border-amber-300 bg-white text-amber-900 focus:border-amber-400 focus:ring-amber-100'
                                : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-400 focus:ring-emerald-100';
                            const helperText = isNegative
                              ? 'Có tải âm, nên kiểm tra lại dấu nhập.'
                              : deadMissing || liveMissing
                                ? 'Ô trống hiện bị hiểu là 0.'
                                : isEmptySpan
                                  ? 'Cả qG và qQ đang về 0 ở nhịp này.'
                                  : isZeroDead
                                    ? 'Nhịp này đang có qG = 0.'
                                    : 'Dòng này đã đủ dữ liệu để solver dùng trực tiếp.';

                            return (
                              <div key={`distributed-span-${idx}`} className={`grid grid-cols-4 gap-2 items-center rounded border p-2 transition-colors ${rowClass}`}>
                                <div>
                                  <div className="text-sm font-semibold text-gray-800">Nhịp {idx + 1}</div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {isNegative && <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">Kiểm tra dấu</span>}
                                    {!isNegative && (deadMissing || liveMissing) && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Ô trống → 0</span>}
                                    {!isNegative && !deadMissing && !liveMissing && isEmptySpan && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Nhịp đang không tải</span>}
                                    {!isNegative && !deadMissing && !liveMissing && !isEmptySpan && isZeroDead && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">qG = 0</span>}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-700">
                                  <div>{Number(span || 0).toFixed(2)} m</div>
                                  <div className="mt-1 text-[10px] text-gray-500">{helperText}</div>
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={config.deadLoadBySpan_kPa?.[idx] ?? 0}
                                    onChange={(e) => handleDistributedLoadSpanChange('dead', idx, e.target.value)}
                                    className={`w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                                  />
                                  <div className="mt-1 text-[10px] text-gray-500">qG của nhịp {idx + 1}</div>
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={config.liveLoadBySpan_kPa?.[idx] ?? 0}
                                    onChange={(e) => handleDistributedLoadSpanChange('live', idx, e.target.value)}
                                    className={`w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                                  />
                                  <div className="mt-1 text-[10px] text-gray-500">qQ của nhịp {idx + 1}</div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="rounded border border-emerald-100 bg-emerald-50 p-2 text-[10px] text-gray-700 space-y-1">
                            <div><b>Cách hiểu:</b> hệ sẽ tính nội lực theo đúng bộ qG/qQ của từng nhịp; không còn giả định mọi nhịp nhận cùng một giá trị tải phân bố.</div>
                            <div><b>Lưu ý hiện tại:</b> tải gió vẫn đang áp đều theo toàn dầm như flow hiện hữu.</div>
                          </div>
                        </div>
                      )}

                      {/* ✅ NEW: Creep factor cho trần */}
                      <div className="col-span-2">
                        <label className="text-xs block font-bold">Hệ số từ biến φ</label>
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactor"
                          value={config.creepFactor}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                        <div className="text-[10px] text-gray-600 mt-1">
                          Áp dụng cho tải lâu dài (Dead + tải treo) khi tính độ võng trần.
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs block font-bold">Hệ số từ biến uốn φb (tuỳ chọn)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactorBending"
                          value={config.creepFactorBending}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                        <div className="text-[10px] text-gray-600 mt-1">
                          Dùng để giảm EI dài hạn khi cần xét võng lâu dài.
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-emerald-200 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-emerald-800">Tải treo (tải tập trung) — tọa độ X theo toàn dầm</div>
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({
                            ...prev,
                            pointLoads: [...(prev.pointLoads || []), { x_m: 0, P_kN: 0.2, note: '', type: 'permanent' }]
                          }))}
                          className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
                        >
                          + Thêm tải
                        </button>
                      </div>

                      <div className="mt-2 space-y-2">
                        {(config.pointLoads || []).map((pl, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">X (m)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={pl.x_m}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], x_m: Number.isFinite(v) ? v : 0 };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">P (kN, + xuống)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={pl.P_kN}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], P_kN: Number.isFinite(v) ? v : 0 };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="text-[10px] block text-gray-600">Nhóm tải</label>
                              <select
                                value={pl.type || 'permanent'}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], type: v };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              >
                                <option value="permanent">G (dài hạn)</option>
                                <option value="variable">Q (ngắn hạn)</option>
                              </select>
                            </div>

                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">Ghi chú</label>
                              <input
                                type="text"
                                value={pl.note || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], note: v };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setConfig(prev => {
                                  const arr = [...(prev.pointLoads || [])];
                                  arr.splice(idx, 1);
                                  return { ...prev, pointLoads: arr };
                                })}
                                className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                              >
                                x
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] text-gray-600 mt-2">
                        Ví dụ kiểm tra nhanh: nhịp 3m + 3m, X=1.5m P=0.30kN và X=4.5m P=0.30kN (biểu đồ lực cắt sẽ nhảy 0.30kN đúng tại vị trí đặt tải).
                      </div>
                    </div>
                  </div>
                )}

                {config.panelType === 'internal' && config.internalWallType === 'cold_storage' && (
                  <div className="col-span-2 mt-2 bg-blue-50 p-2 rounded border border-blue-200">
                    <label className="text-xs block mb-1 font-bold text-blue-700 flex items-center gap-1"><TrendingUp size={12} /> Hệ số từ biến</label>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactor"
                          value={config.creepFactor}
                          onChange={handleInputChange}
                          className="w-20 border p-1 rounded border-blue-300 focus:border-blue-500 text-sm"
                        />
                        <span className="text-[10px] text-gray-500">φ cắt (mặc định 2.4)</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactorBending"
                          value={config.creepFactorBending}
                          onChange={handleInputChange}
                          className="w-20 border p-1 rounded border-blue-300 focus:border-blue-500 text-sm"
                        />
                        <span className="text-[10px] text-gray-500">φb uốn (tuỳ chọn)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>


    );
};

export default InputPanel;
