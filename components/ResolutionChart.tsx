/**
 * ResolutionChart Component
 * 
 * REQUIRED DEPENDENCIES:
 * Run: npm install recharts
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// TODO: Uncomment after installing recharts
// import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  totalReports: number;
  resolvedReports: number;
}

interface ResolutionChartProps {
  data: ChartData[];
  title?: string;
}

export default function ResolutionChart({ data, title = 'Resolution Trend' }: ResolutionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available
          </p>
        </CardContent>
      </Card>
    );
  }

  // Temporary placeholder until recharts is installed
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex flex-col items-center justify-center space-y-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Install Recharts to view charts:</p>
            <div className="bg-secondary p-3 rounded-md text-sm font-mono">
              npm install recharts
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Data points: {data.length}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // TODO: Uncomment after installing recharts
  /*
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalReports"
              stroke="#3b82f6"
              name="Total Reports"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="resolvedReports"
              stroke="#22c55e"
              name="Resolved Reports"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
  */
}
