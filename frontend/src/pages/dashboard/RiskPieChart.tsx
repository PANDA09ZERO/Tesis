import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

// Color por nivel (no por posición): si falta un nivel, los demás conservan el suyo.
const LEVELS = [
  { key: 'alto', name: 'Alto', color: '#ef4444' },
  { key: 'medio', name: 'Medio', color: '#f59e0b' },
  { key: 'bajo', name: 'Bajo', color: '#22c55e' },
] as const;

/** Gráfico de alertas por nivel de riesgo. Se carga aparte para no sumar recharts al panel. */
export default function RiskPieChart({ alertas }: { alertas: Array<{ tipo_riesgo?: string }> }) {
  const data = LEVELS
    .map(level => ({ ...level, value: alertas.filter(a => a.tipo_riesgo === level.key).length }))
    .filter(level => level.value > 0);
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie dataKey="value" data={data} cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
          {data.map(level => <Cell key={level.key} fill={level.color} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
