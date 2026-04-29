'use client'

import { useState } from 'react'
import { AdminProvider } from '../../providers/AdminProvider'
import { AdminRealtimeProvider } from '../../providers/RealtimeProvider'
import AdminHeader from './AdminHeader'
import KPIStrip from './KPIStrip'
import TabBar, { type TabId } from './TabBar'
import QueueTab from './tabs/QueueTab'
import HistoryTab from './tabs/HistoryTab'
import SearchTab from './tabs/SearchTab'
import ChatTab from './tabs/ChatTab'
import TablesTab from './tabs/TablesTab'
import MenuTab from './tabs/MenuTab'

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminRealtimeProvider>
        <Layout />
      </AdminRealtimeProvider>
    </AdminProvider>
  )
}

function Layout() {
  const [activeTab, setActiveTab] = useState<TabId>('cola')

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="pt-[52px]">
        <KPIStrip />
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="px-[14px] py-[10px] pb-8">
          <TabContent tab={activeTab} />
        </div>
      </div>
    </div>
  )
}

function TabContent({ tab }: { tab: TabId }) {
  if (tab === 'cola')      return <QueueTab />
  if (tab === 'historial') return <HistoryTab />
  if (tab === 'buscar')    return <SearchTab />
  if (tab === 'chat')      return <ChatTab />
  if (tab === 'mesas')     return <TablesTab />
  if (tab === 'menu')      return <MenuTab />

  return (
    <div className="flex items-center justify-center py-12 text-white/20 text-sm">
      [{tab}]
    </div>
  )
}
