// components/dashboard/RevenueDistributionWidget.tsx
import {useRouter} from "expo-router";
import { useAuth } from "@/context/AuthContext";
import database from "@/database";
import { CashAccount } from "@/database/models/CashAccount";
import { formatCurrency } from "@/utils/dashboardUtils";
import { Q } from "@nozbe/watermelondb";
import React from "react";
import { ThreeDPieChart } from "../charts/ThreePieCharts";
import { BaseWidget } from "./BaseWidget";

interface RevenueData {
  cash: number;
  bank: number;
  mobile: number;
  receivables: number;
  total: number;
}

export function RevenueDistributionWidget() {
  const { currentShop } = useAuth();
  const router = useRouter();

  const fetchRevenueData = async (): Promise<RevenueData> => {
    if (!currentShop) throw new Error("No shop selected");

    const cashAccounts = await database
      .get<CashAccount>("cash_accounts")
      .query(Q.where("shop_id", currentShop.id))
      .fetch();

    const cash = cashAccounts
      .filter((a) => a.type === "cash")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const bank = cashAccounts
      .filter((a) => a.type === "bank_account")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const mobile = cashAccounts
      .filter((a) => a.type === "mobile_money")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const receivables = cashAccounts
      .filter((a) => a.type === "receivable")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    return {
      cash,
      bank,
      mobile,
      receivables,
      total: cash + bank + mobile + receivables,
    };
  };

  return (
    <BaseWidget<RevenueData>
      title="Revenue Distribution"
      fetchData={fetchRevenueData}
      refreshInterval={600000} // 10 minutes
      action={{
        label: "View All",
        icon: "arrow-forward",
        onPress: () => router.push("/cash-flow"),
      }}
    >
      {(data) => (
        <ThreeDPieChart
          data={[
            { value: data.cash, color: "#22c55e", label: "Cash" },
            { value: data.bank, color: "#3b82f6", label: "Bank" },
            { value: data.mobile, color: "#f59e0b", label: "Mobile" },
            { value: data.receivables, color: "#ef4444", label: "Receivables" },
          ]}
          total={data.total}
          formatValue={formatCurrency}
        />
      )}
    </BaseWidget>
  );
}
