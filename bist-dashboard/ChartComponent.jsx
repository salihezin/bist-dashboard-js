import { Line } from 'react-chartjs-2';

export default function ChartComponent({ data }) {
  const chartData = {
    labels: data.dates,
    datasets: [
      {
        label: 'Fiyat',
        data: data.close,
        borderColor: 'blue',
        fill: false,
      },
      {
        label: 'Bollinger Alt',
        data: data.lowerBand,
        borderColor: 'red',
        fill: false,
      },
      {
        label: 'VWMA21',
        data: data.vwma21,
        borderColor: 'green',
        fill: false,
      },
    ],
  };

  return <Line data={chartData} />;
}
