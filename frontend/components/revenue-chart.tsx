"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { month: "Jan", facturable: 4000, nonFacturable: 2400, conditionnel: 1200 },
  { month: "Fév", facturable: 3000, nonFacturable: 1398, conditionnel: 2210 },
  { month: "Mar", facturable: 2000, nonFacturable: 9800, conditionnel: 2290 },
  { month: "Avr", facturable: 2780, nonFacturable: 3908, conditionnel: 2000 },
  { month: "Mai", facturable: 1890, nonFacturable: 4800, conditionnel: 2181 },
  { month: "Juin", facturable: 2390, nonFacturable: 3800, conditionnel: 2500 },
]

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des dossiers</CardTitle>
        <CardDescription>Nombre de dossiers par statut de facturation</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="facturable" fill="#10b981" name="Facturable" />
            <Bar dataKey="nonFacturable" fill="#ef4444" name="Non-facturable" />
            <Bar dataKey="conditionnel" fill="#f59e0b" name="Conditionnel" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
