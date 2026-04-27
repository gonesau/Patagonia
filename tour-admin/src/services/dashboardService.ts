import { collection, getCountFromServer, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { toursService } from "./toursService";
import { pagosService } from "./pagosService";

export interface DashboardMetrics {
  toursProximos30Dias: number;
  vagosActivos: number;
  ingresosMes: number;
  toursAnio: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const plus30Days = new Date(now);
  plus30Days.setDate(now.getDate() + 30);
  const startYear = new Date(now.getFullYear(), 0, 1);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [vagosCount, tours, toursYear] = await Promise.all([
    getCountFromServer(query(collection(db, "vagos"), where("activo", "==", true))),
    toursService.list(),
    getDocs(query(collection(db, "tours"), where("fechaInicio", ">=", startYear))),
  ]);

  const upcomingTours = tours.filter((tour) => {
    const date = new Date(tour.fechaInicio);
    return date >= now && date <= plus30Days;
  });

  const tourPayments = await Promise.all(upcomingTours.map((tour) => pagosService.listByTour(tour.id)));
  const monthlyIncome = tourPayments
    .flat()
    .filter((payment) => new Date(payment.fecha) >= startMonth)
    .reduce((total, payment) => total + payment.monto, 0);

  return {
    toursProximos30Dias: upcomingTours.length,
    vagosActivos: vagosCount.data().count,
    ingresosMes: monthlyIncome,
    toursAnio: toursYear.size,
  };
}
