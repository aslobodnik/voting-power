import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { unstable_noStore } from "next/cache";

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT as unknown as number,
  password: process.env.DB_PASSWORD,
});

export async function GET(request: NextRequest) {
  unstable_noStore();
  try {
    const q = `
          select * from top_1000_holders order by balance desc;
  `;
    const result = await pool.query(q);

    const json = {
      message: "Data retrieved successfully",
      data: result.rows,
    };

    return NextResponse.json(json);
  } catch (error) {
    console.error("Database query error:", error);
    return NextResponse.json(
      { error: "An error occurred while querying the database" },
      { status: 500 }
    );
  }
}
