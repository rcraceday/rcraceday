import { useParams } from "react-router-dom";
import BackNavButton from "@/components/ui/BackNavButton";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function CalendarItemDetails() {
  const { id, clubSlug } = useParams();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      setLoading(true);

      const { data, error } = await supabase
        .from("calendar")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) setItem(data);

      setLoading(false);
    }

    loadItem();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center px-4 py-6">
        <div className="w-full max-w-xl">
          <p className="text-gray-600">Loading item…</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex justify-center px-4 py-6">
        <div className="w-full max-w-xl">
          <p className="text-gray-600">Item not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center px-4 py-6">
      <div className="w-full max-w-xl space-y-6">

        {/* Title */}
        <h1 className="text-3xl font-bold leading-snug">
          {item.title}
        </h1>

        {/* Date */}
        <div className="text-gray-700 text-lg">
          <span className="font-semibold">Date:</span>{" "}
          {formatDate(item.calendar_date)}
        </div>

        {/* Type */}
        {item.type && (
          <div className="text-gray-700">
            <span className="font-semibold">Type:</span>{" "}
            {item.type}
          </div>
        )}

        {/* Description */}
        {item.description && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Details</h2>
            <p className="text-gray-800 whitespace-pre-line leading-relaxed">
              {item.description}
            </p>
          </section>
        )}

        {/* Back Button */}
        <div className="pt-2">
          <BackNavButton variant="secondary" />
        </div>

      </div>
    </div>
  );
}
