'use client';

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
    ComposedChart,
    Legend,
    Area,
    AreaChart
} from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#991b1b', '#059669', '#2563eb', '#d97706', '#7c3aed', '#db2777'];

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export const ChartCard = ({ title, subtitle, children }: ChartCardProps) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden"
    >
        <div className="mb-8">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{subtitle}</p>}
        </div>
        <div className="h-96 w-full">
            {children}
        </div>
    </motion.div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900/95 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-2 border-b border-white/10 pb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-6 py-1">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{entry.name}</span>
                        <span className="text-sm font-black text-white" style={{ color: entry.color || entry.fill }}>
                            {typeof entry.value === 'number' && entry.name.toLowerCase().includes('ingr')
                                ? `${entry.value.toLocaleString()} €`
                                : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const MonthlyEvolutionChart = ({ data }: { data: any[] }) => (
    <ChartCard title="Evolució d'Ingressos" subtitle="Comparativa mensual filtrada">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#991b1b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#991b1b" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                    tickFormatter={(val) => val.split('-')[1]}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                    tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey="income"
                    name="Ingressos"
                    stroke="#991b1b"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorInc)"
                />
            </AreaChart>
        </ResponsiveContainer>
    </ChartCard>
);

export const VolumeVsRevenueChart = ({ data }: { data: any[] }) => (
    <ChartCard title="Volum vs Facturació" subtitle="Nº de bolos vs total ingressat">
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                />
                <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="count" name="Bolos" fill="#1f2937" radius={[8, 8, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="income" name="Ingressos" stroke="#991b1b" strokeWidth={3} dot={{ fill: '#991b1b', strokeWidth: 2, r: 4 }} />
            </ComposedChart>
        </ResponsiveContainer>
    </ChartCard>
);

export const TopTownsChart = ({ data }: { data: any[] }) => (
    <ChartCard title="Top 10 Pobles" subtitle="Poblacions amb més ingressos">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#374151' }}
                    width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="income" name="Ingressos" fill="#991b1b" radius={[0, 10, 10, 0]} barSize={16}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </ChartCard>
);

export const PaymentDistributionChart = ({ data }: { data: any[] }) => (
    <ChartCard title="Distribució Pagaments" subtitle="Facturat vs Efectiu">
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#991b1b' : '#1f2937'} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    formatter={(val) => <span className="text-[10px] font-black uppercase text-gray-500 tracking-tighter">{val}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    </ChartCard>
);

export const PriceRangesChart = ({ data }: { data: any[] }) => (
    <ChartCard title="Rang de Preus" subtitle="Distribució de preus dels bolos">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Bolos" fill="#d97706" radius={[12, 12, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartCard>
);
