export default function DetailsCard({ icon, title, text }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-orange-100 p-6 text-center hover:shadow-lg transition">
      <div className="flex justify-center items-center mb-3">
        <span className="text-4xl">{icon}</span>
      </div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-gray-600">{text}</p>
    </div>
  );
}
