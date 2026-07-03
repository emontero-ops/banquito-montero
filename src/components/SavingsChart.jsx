import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/**
 * Chart to show savings evolution over time
 */
function SavingsChart({ transactions }) {
  // Process data: group by date, calculate daily net, then cumulative
  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Ahorro Familiar Acumulado',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      };
    }

    try {
      // Group by date
      const dailyTotals = {};
      transactions.forEach(t => {
        if (t.type === 'loan_received') return; // Skip loan received transactions in physical fund savings chart
        const date = t.created_at ? t.created_at.split('T')[0] : t.date;
        if (!dailyTotals[date]) {
          dailyTotals[date] = 0;
        }
        dailyTotals[date] += t.amount; // amount already signed (+ for deposit, - for withdrawal, - for loan_given)
      });

      // Sort dates ascending
      const sortedDates = Object.keys(dailyTotals).sort((a, b) => new Date(a) - new Date(b));

      // Calculate cumulative sum
      let cumulative = 0;
      const cumulativeData = sortedDates.map(date => {
        cumulative += dailyTotals[date];
        return cumulative;
      });

      return {
        labels: sortedDates,
        datasets: [{
          label: 'Ahorro Familiar Acumulado',
          data: cumulativeData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          fill: true
        }]
      };
    } catch (error) {
      console.error('Error processing chart data:', error);
      // Return empty chart on error to prevent breaking UI
      return {
        labels: [],
        datasets: [{
          label: 'Ahorro Familiar Acumulado',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      };
    }
  }, [transactions]); // Recalculate when transactions change

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Evolución del Ahorro Familiar'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Monto ($)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Fecha'
        }
      }
    }
  }), []);

  if (chartData.labels.length === 0) {
    return (
      <div className="chart-placeholder" style={{ 
        textAlign: 'center', 
        padding: '30px',
        color: '#666',
        fontStyle: 'italic'
      }}>
        <p>Agregue transacciones para ver la gráfica de evolución</p>
      </div>
    );
  }

  // Create a key that changes when the data meaningfully changes
  // We use the length of labels and a hash of the data array
  const dataHash = chartData.datasets[0]?.data?.reduce((hash, val) => {
    return ((hash << 5) - hash) + val;
  }, 0) || 0;
  
  const chartKey = `${chartData.labels.length}-${dataHash}`;

  return (
    <div 
      className="chart-container" 
      style={{ 
        minHeight: '450px',
        height: '450px',
        width: '100%',
        marginTop: '24px',
        position: 'relative'
      }}
    >
      <Line 
        data={chartData} 
        options={options}
        key={chartKey}
      />
    </div>
  );
}

export default SavingsChart;