import React from 'react';
import { 
    Calculator, Save, RotateCcw, Download, Printer, Copy,
    ChevronDown, ChevronUp, Maximize2, Minimize2, Settings, Plus, X, List, Eye, Settings2, BarChart2
} from 'lucide-react';

const ChartPanel = (props) => {
    const { config, setConfig, results, setResults, handleInputChange, activeTab } = props;
    // Add missing props here later

    return (
        <div id="tab-charts" className={activeTab === 'charts' ? 'block w-full space-y-6' : 'hidden'}>
          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">
              {config.panelType === 'ceiling' ? 'Sơ đồ tính trần (X toàn dầm)' : 'Sơ đồ tính (tải + gối)'}
            </h3>

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

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ chuyển vị</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="mm" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />

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
                  />

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

                  {/* ✅ Creep (chỉ rõ phần tăng do từ biến) */}
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

                  <Line type="step" dataKey="limitPlus" stroke="red" strokeWidth={1} strokeDasharray="10 5" dot={false} activeDot={false} name="Giới hạn (+)" />
                  <Line type="step" dataKey="limitMinus" stroke="red" strokeWidth={1} strokeDasharray="10 5" dot={false} activeDot={false} name="Giới hạn (-)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ mô-men uốn</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="kNm" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Area type="monotone" dataKey="moment" stroke="#ff7300" fill="#fff7ed" name="Mô-men" dot={false} activeDot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ lực cắt</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="kN" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Area type="linear" dataKey="shear" stroke="#82ca9d" fill="#82ca9d" name="Lực Cắt" dot={false} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ phản lực gối</h3>
            <div className="mb-3">
              <ReactionLegend />
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={results.reactionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="kN" />
                  <Tooltip content={<CustomTooltip />} />
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


    );
};

export default ChartPanel;
