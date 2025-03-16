// app/api/debug-db/route.ts
import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
    try {
        await initializeDatabase();
        return NextResponse.json({ success: true, message: "Database initialization check completed" });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
