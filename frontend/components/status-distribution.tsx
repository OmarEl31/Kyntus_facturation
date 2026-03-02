"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { name: "Facturable", value: 45 },
  { name: "Non-facturable", value: 30 },
  { name: "Conditionnel", value: 25 },
]

const COLORS = ["#10b981", "#ef4444", "#f59e0b"]

export function StatusDistribution() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution des statuts</CardTitle>
        <CardDescription>Répartition actuelle des dossiers</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
