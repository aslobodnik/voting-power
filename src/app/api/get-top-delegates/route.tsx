import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT as unknown as number,
});

export async function GET(request: NextRequest) {
  try {
    const q = `
          SELECT 
            ROW_NUMBER() OVER (ORDER BY SUM(delegator_balance) DESC) as rank,
            delegate as delegate_address,
            SUM(delegator_balance) AS voting_power,
            COUNT(DISTINCT delegator) AS delegations,
            COUNT(DISTINCT CASE WHEN delegator_balance >= 1000000000000000000 THEN delegator END) AS non_zero_delegations
        FROM 
            current_delegations
        GROUP BY 
            delegate
        ORDER BY
            voting_power DESC
        LIMIT 100;
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
