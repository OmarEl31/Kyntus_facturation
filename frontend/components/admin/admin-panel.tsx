"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AgenciesTab } from "./agencies-tab"
import { TechniciansTab } from "./technicians-tab"
import { UsersTab } from "./users-tab"

export function AdminPanel() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600 mt-2">Gestion des agences, techniciens et utilisateurs</p>
      </div>

      {/* Tabs */}
      <div className="card">
        <Tabs defaultValue="agencies" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agencies">Agences</TabsTrigger>
            <TabsTrigger value="technicians">Techniciens</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          </TabsList>

          <TabsContent value="agencies" className="mt-6">
            <AgenciesTab />
          </TabsContent>

          <TabsContent value="technicians" className="mt-6">
            <TechniciansTab />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
