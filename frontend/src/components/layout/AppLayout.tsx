import React from 'react';
import Sidebar from './Sidebar';
import TaskPanel from './TaskPanel';
import ContentHeader from './ContentHeader';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ContentHeader title={title} />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {children}
          </main>
          <TaskPanel />
        </div>
      </div>
    </div>
  );
}
