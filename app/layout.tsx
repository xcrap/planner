import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Gantt Task Planner',
    description: 'Managing tasks and proejcts with Gantt charts',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-neutral-50 flex flex-col h-screen`}>{children}</body>
        </html>
    )
}
