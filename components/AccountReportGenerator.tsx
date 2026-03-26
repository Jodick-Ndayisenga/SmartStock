// components/AccountReportGenerator.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { CashAccount } from '@/database/models/CashAccount';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  date: number;
  type: string;
  description: string;
  amount: number;
  category?: string;
  reference?: string;
  balanceBefore: number;
  balanceAfter: number;
  displayType: 'income' | 'expense' | 'transfer';
  displayAmount: number;
  displayDescription: string;
  categoryName?: string;
}

interface AccountReportGeneratorProps {
  visible: boolean;
  onClose: () => void;
  account: CashAccount;
  transactions: Transaction[];
  stats: {
    totalIncome: number;
    totalExpense: number;
    netFlow: number;
    transactionCount: number;
  };
  shopName: string;
  isDark?: boolean;
}

const AccountReportGenerator: React.FC<AccountReportGeneratorProps> = ({
  visible,
  onClose,
  account,
  transactions,
  stats,
  shopName,
  isDark = false
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const filterTransactionsByPeriod = (period: string) => {
    const now = new Date();
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      
      switch (period) {
        case 'today':
          return txDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return txDate >= weekAgo;
        case 'month':
          return txDate.getMonth() === now.getMonth() && 
                 txDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'All Time';
    }
  };

  const generateHTML = (filteredTransactions: Transaction[], periodStats: any) => {
    const currencySymbol = account.currency === 'BIF' ? 'FBu' : '$';
    const currentDate = format(new Date(), 'MMMM dd, yyyy HH:mm');
    const periodLabel = getPeriodLabel();
    
    // Format numbers with 2 decimal places
    const formatMoney = (amount: number) => {
      return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Statement - ${account.name}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            background: #f8fafc;
            padding: 40px;
            color: #1e293b;
            line-height: 1.5;
          }
          
          .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }
          
          /* Header Section */
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            position: relative;
          }
          
          .header-content {
            position: relative;
            z-index: 1;
          }
          
          .company-name {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          
          .report-title {
            font-size: 20px;
            font-weight: 500;
            opacity: 0.95;
            margin-bottom: 4px;
          }
          
          .report-date {
            font-size: 14px;
            opacity: 0.85;
            margin-top: 16px;
          }
          
          /* Account Info Card */
          .account-card {
            background: white;
            margin: -30px 30px 30px 30px;
            border-radius: 20px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            padding: 30px;
            position: relative;
            z-index: 2;
          }
          
          .account-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .account-name {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
          }
          
          .account-type {
            font-size: 14px;
            color: #64748b;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .account-balance {
            text-align: right;
          }
          
          .balance-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          
          .balance-amount {
            font-size: 32px;
            font-weight: 800;
            color: #0f172a;
          }
          
          .account-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          
          .detail-item {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .detail-icon {
            width: 40px;
            height: 40px;
            background: #f1f5f9;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }
          
          .detail-content {
            flex: 1;
          }
          
          .detail-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 4px;
          }
          
          .detail-value {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
          }
          
          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 30px;
          }
          
          .stat-card {
            background: #f8fafc;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            transition: transform 0.2s;
          }
          
          .stat-value {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 8px;
          }
          
          .stat-income { color: #10b981; }
          .stat-expense { color: #ef4444; }
          .stat-transfer { color: #3b82f6; }
          .stat-count { color: #8b5cf6; }
          
          .stat-label {
            font-size: 13px;
            color: #64748b;
            font-weight: 500;
          }
          
          /* Transactions Table */
          .transactions-section {
            margin: 30px;
          }
          
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
          }
          
          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
          }
          
          .transaction-count {
            font-size: 14px;
            color: #64748b;
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 20px;
          }
          
          .transactions-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          }
          
          .transactions-table th {
            background: #f8fafc;
            padding: 16px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .transactions-table td {
            padding: 16px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
          }
          
          .transactions-table tr:last-child td {
            border-bottom: none;
          }
          
          .type-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            width: fit-content;
          }
          
          .type-income {
            background: #d1fae5;
            color: #065f46;
          }
          
          .type-expense {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .type-transfer {
            background: #dbeafe;
            color: #1e40af;
          }
          
          .amount-positive {
            color: #10b981;
            font-weight: 600;
          }
          
          .amount-negative {
            color: #ef4444;
            font-weight: 600;
          }
          
          .category-badge {
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 12px;
            color: #475569;
            display: inline-block;
          }
          
          .reference-text {
            font-family: monospace;
            font-size: 12px;
            color: #64748b;
          }
          
          /* Footer */
          .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            margin-top: 30px;
          }
          
          .footer-text {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
          }
          
          .footer-note {
            font-size: 11px;
            color: #94a3b8;
          }
          
          /* Print Styles */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .report-container {
              box-shadow: none;
              border-radius: 0;
            }
            
            .stats-grid {
              break-inside: avoid;
            }
            
            .transactions-table {
              break-inside: auto;
            }
            
            tr {
              break-inside: avoid;
              break-after: auto;
            }
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            body {
              padding: 20px;
            }
            
            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .account-header {
              flex-direction: column;
              gap: 16px;
            }
            
            .account-balance {
              text-align: left;
            }
            
            .section-header {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- Header -->
          <div class="header">
            <div class="header-content">
              <div class="company-name">${shopName || 'Business Report'}</div>
              <div class="report-title">Account Statement</div>
              <div class="report-date">Generated on ${currentDate}</div>
            </div>
          </div>
          
          <!-- Account Information Card -->
          <div class="account-card">
            <div class="account-header">
              <div>
                <div class="account-name">${account.name}</div>
                <div class="account-type">
                  <span>${account.type.toUpperCase()}</span>
                  <span>•</span>
                  <span>${account.currency}</span>
                  ${account.isActive ? '<span style="color: #10b981;">● Active</span>' : '<span style="color: #ef4444;">● Inactive</span>'}
                </div>
              </div>
              <div class="account-balance">
                <div class="balance-label">Current Balance</div>
                <div class="balance-amount">${formatMoney(account.currentBalance || 0)}</div>
              </div>
            </div>
            
            <div class="account-details-grid">
              ${account.accountNumber ? `
              <div class="detail-item">
                <div class="detail-icon">🏦</div>
                <div class="detail-content">
                  <div class="detail-label">Account Number</div>
                  <div class="detail-value">${account.accountNumber}</div>
                </div>
              </div>
              ` : ''}
              
              ${account.bankName ? `
              <div class="detail-item">
                <div class="detail-icon">🏛️</div>
                <div class="detail-content">
                  <div class="detail-label">Bank / Institution</div>
                  <div class="detail-value">${account.bankName}</div>
                </div>
              </div>
              ` : ''}
              
              <div class="detail-item">
                <div class="detail-icon">💰</div>
                <div class="detail-content">
                  <div class="detail-label">Opening Balance</div>
                  <div class="detail-value">${formatMoney(account.openingBalance || 0)}</div>
                </div>
              </div>
              
              ${account.notes ? `
              <div class="detail-item">
                <div class="detail-icon">📝</div>
                <div class="detail-content">
                  <div class="detail-label">Notes</div>
                  <div class="detail-value">${account.notes.substring(0, 100)}</div>
                </div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Statistics Grid -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value stat-income">${formatMoney(stats.totalIncome)}</div>
              <div class="stat-label">Total Income</div>
            </div>
            <div class="stat-card">
              <div class="stat-value stat-expense">${formatMoney(stats.totalExpense)}</div>
              <div class="stat-label">Total Expenses</div>
            </div>
            <div class="stat-card">
              <div class="stat-value ${stats.netFlow >= 0 ? 'stat-income' : 'stat-expense'}">
                ${formatMoney(Math.abs(stats.netFlow))}
              </div>
              <div class="stat-label">Net ${stats.netFlow >= 0 ? 'Profit' : 'Loss'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-value stat-count">${filteredTransactions.length}</div>
              <div class="stat-label">Transactions (${periodLabel})</div>
            </div>
          </div>
          
          <!-- Transactions Table -->
          <div class="transactions-section">
            <div class="section-header">
              <div class="section-title">Transaction Details</div>
              <div class="transaction-count">
                Showing ${filteredTransactions.length} of ${transactions.length} total transactions
              </div>
            </div>
            
            <table class="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Reference</th>
                  <th style="text-align: right;">Amount</th>
                  <th style="text-align: right;">Balance After</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTransactions.map(tx => {
                  const typeClass = tx.displayType;
                  const amountClass = tx.displayType === 'income' ? 'amount-positive' : 'amount-negative';
                  const amountSign = tx.displayType === 'income' ? '+' : '-';
                  
                  return `
                    <tr>
                      <td style="white-space: nowrap;">${format(new Date(tx.date), 'MMM dd, yyyy')}</td>
                      <td>
                        <span class="type-badge type-${typeClass}">
                          ${tx.displayType === 'income' ? '↑ Income' : tx.displayType === 'expense' ? '↓ Expense' : '↔ Transfer'}
                        </span>
                      </td>
                      <td style="max-width: 250px;">
                        <strong>${tx.displayDescription}</strong>
                        ${tx.description !== tx.displayDescription ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">${tx.description.substring(0, 60)}</div>` : ''}
                      </td>
                      <td>
                        ${tx.categoryName ? `<span class="category-badge">${tx.categoryName}</span>` : '-'}
                      </td>
                      <td>
                        ${tx.reference ? `<span class="reference-text">${tx.reference}</span>` : '-'}
                      </td>
                      <td style="text-align: right;">
                        <span class="${amountClass}">
                          ${amountSign} ${formatMoney(tx.displayAmount)}
                        </span>
                      </td>
                      <td style="text-align: right; font-family: monospace;">
                        ${formatMoney(tx.balanceAfter)}
                      </td>
                    </tr>
                  `;
                }).join('')}
                
                ${filteredTransactions.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 60px 20px;">
                      <div style="font-size: 16px; color: #94a3b8;">No transactions found for this period</div>
                      <div style="font-size: 14px; color: #cbd5e1; margin-top: 8px;">Try selecting a different date range</div>
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-text">
              <strong>Account Summary</strong> • Total Transactions: ${transactions.length} • Period: ${periodLabel}
            </div>
            <div class="footer-text">
              Opening Balance: ${formatMoney(account.openingBalance || 0)} → Current Balance: ${formatMoney(account.currentBalance || 0)}
            </div>
            <div class="footer-note">
              This is a computer-generated document. No signature is required.
              Report generated on ${currentDate}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const generateAndSharePDF = async () => {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Filter transactions based on selected period
      const filteredTransactions = filterTransactionsByPeriod(selectedPeriod);
      
      // Calculate period-specific stats
      const periodStats = {
        totalIncome: filteredTransactions
          .filter(t => t.displayType === 'income')
          .reduce((sum, t) => sum + t.displayAmount, 0),
        totalExpense: filteredTransactions
          .filter(t => t.displayType === 'expense')
          .reduce((sum, t) => sum + t.displayAmount, 0),
        transactionCount: filteredTransactions.length
      };

      // Generate HTML content
      const html = generateHTML(filteredTransactions, periodStats);

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        width: 794, // A4 width in points (approx)
        height: 1123, // A4 height in points
        base64: false
      });

      // Create filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
      const filename = `${account.name.replace(/[^a-z0-9]/gi, '_')}_Statement_${timestamp}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${filename}`;

      // Move file to permanent location
      await FileSystem.moveAsync({
        from: uri,
        to: newUri
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Account Statement - ${account.name}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Report generated and shared successfully!');
      onClose();

    } catch (error) {
      console.error('Error generating report:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const periodOptions = [
    { id: 'today' as const, label: 'Today', icon: 'today-outline', description: 'Today\'s transactions' },
    { id: 'week' as const, label: 'This Week', icon: 'calendar-outline', description: 'Last 7 days' },
    { id: 'month' as const, label: 'This Month', icon: 'calendar-outline', description: 'Current month' },
    { id: 'all' as const, label: 'All Time', icon: 'time-outline', description: 'Complete history' }
  ];

  const currencySymbol = account.currency === 'BIF' ? 'FBu' : '$';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className={`${isDark ? 'bg-dark-surface' : 'bg-surface'} rounded-t-3xl`}>
          {/* Header */}
          <View className={`p-6 border-b ${isDark ? 'border-dark-border' : 'border-border'}`}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Generate Report
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 rounded-full items-center justify-center bg-surface-muted dark:bg-dark-surface-muted"
              >
                <Ionicons name="close" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              {account.name} • {currencySymbol} {account.currentBalance?.toLocaleString()}
            </Text>
          </View>

          <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
            {/* Period Selection */}
            <View className="mb-8">
              <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Select Period
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {periodOptions.map(option => {
                  const isSelected = selectedPeriod === option.id;
                  const filteredCount = filterTransactionsByPeriod(option.id).length;
                  
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setSelectedPeriod(option.id)}
                      className={`flex-1 min-w-[100px] p-4 rounded-xl border-2 ${
                        isSelected
                          ? isDark ? 'border-dark-brand bg-dark-brand/10' : 'border-brand bg-brand/10'
                          : isDark ? 'border-dark-border bg-dark-surface-soft' : 'border-border bg-surface-soft'
                      }`}
                    >
                      <Ionicons 
                        name={option.icon as any} 
                        size={24} 
                        color={isSelected ? (isDark ? '#38bdf8' : '#0ea5e9') : (isDark ? '#94a3b8' : '#64748b')}
                      />
                      <Text className={`font-semibold mt-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                        {option.label}
                      </Text>
                      <Text className={`text-xs mt-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                        {filteredCount} transactions
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Report Preview Stats */}
            <View className={`mb-8 p-5 rounded-2xl ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} border ${isDark ? 'border-dark-border' : 'border-border'}`}>
              <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Report Preview
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                  <Text className={isDark ? 'text-dark-text-soft' : 'text-text-soft'}>Period</Text>
                  <Text className={`font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    {getPeriodLabel()}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                  <Text className={isDark ? 'text-dark-text-soft' : 'text-text-soft'}>Transactions</Text>
                  <Text className={`font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    {filterTransactionsByPeriod(selectedPeriod).length} records
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                  <Text className={isDark ? 'text-dark-text-soft' : 'text-text-soft'}>Total Income</Text>
                  <Text className="font-semibold text-success">
                    {currencySymbol} {filterTransactionsByPeriod(selectedPeriod)
                      .filter(t => t.displayType === 'income')
                      .reduce((sum, t) => sum + t.displayAmount, 0)
                      .toLocaleString()}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                  <Text className={isDark ? 'text-dark-text-soft' : 'text-text-soft'}>Total Expenses</Text>
                  <Text className="font-semibold text-error">
                    {currencySymbol} {filterTransactionsByPeriod(selectedPeriod)
                      .filter(t => t.displayType === 'expense')
                      .reduce((sum, t) => sum + t.displayAmount, 0)
                      .toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              onPress={generateAndSharePDF}
              disabled={isGenerating}
              className={`flex-row items-center justify-center py-4 rounded-xl mb-6 ${
                isGenerating ? 'opacity-70' : ''
              } ${isDark ? 'bg-dark-brand' : 'bg-brand'}`}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white text-lg font-semibold ml-3">
                    Generating Report...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={24} color="white" />
                  <Text className="text-white text-lg font-semibold ml-3">
                    Generate PDF Report
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Info Note */}
            <View className={`p-4 rounded-xl ${isDark ? 'bg-dark-surface-muted/50' : 'bg-surface-muted/50'} border ${isDark ? 'border-dark-border/50' : 'border-border/50'} mb-8`}>
              <View className="flex-row items-start">
                <Ionicons 
                  name="information-circle-outline" 
                  size={20} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <Text className={`text-sm flex-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  The report includes all transaction details, account information, and summary statistics.
                  Generated PDF will be shared via your device's sharing options.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AccountReportGenerator;