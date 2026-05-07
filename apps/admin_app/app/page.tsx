import DashboardLayout from "./(dashboard)/layout";
import DashboardHome from "./(dashboard)/DashboardHome";

export default async function RootPage() {
  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  );
}

