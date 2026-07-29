import { AdminGuestForm } from "@/components/AdminGuestForm";

export default function NewGuestPage() {
  return (
    <section>
      <h1 className="text-3xl font-black text-[#004F2F]">Добавить гостя</h1>
      <AdminGuestForm />
    </section>
  );
}
