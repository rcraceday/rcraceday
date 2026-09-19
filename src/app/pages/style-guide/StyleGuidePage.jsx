// src/app/pages/style-guide/StyleGuidePage.jsx

import { useOutletContext } from "react-router-dom";
import {
  UserPlusIcon,
  TrashIcon,
  PencilSquareIcon,
  IdentificationIcon,
} from "@heroicons/react/24/solid";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import PageTitle from "@/components/ui/PageTitle";

export default function StyleGuidePage() {
  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title="Style Guide"
        style={{ color: brand }}
      />

      {/* MAIN */}
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* ------------------------------------------------------------
            BUTTONS
        ------------------------------------------------------------ */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Buttons</h2>

          <Card
            className="p-6 space-y-4"
          >
            {/* Primary */}
            <div className="space-y-1">
              <p className="font-medium">Primary Button</p>
              <Button className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto justify-center">
                <UserPlusIcon className="h-4 w-4" />
                Primary
              </Button>
            </div>

            {/* Secondary */}
            <div className="space-y-1">
              <p className="font-medium">Secondary Button</p>
              <Button
                variant="secondary"
                className="flex items-center gap-1 w-full sm:w-auto justify-center"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Secondary
              </Button>
            </div>

            {/* Danger */}
            <div className="space-y-1">
              <p className="font-medium">Danger Button</p>
              <Button
                variant="danger"
                className="flex items-center gap-1 bg-red-600 text-white hover:bg-red-700 w-full sm:w-auto justify-center"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </div>

            {/* Full Width */}
            <div className="space-y-1">
              <p className="font-medium">Full‑Width Button</p>
              <Button className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
                Full Width
              </Button>
            </div>

            {/* Disabled */}
            <div className="space-y-1">
              <p className="font-medium">Disabled Button</p>
              <Button disabled className="w-full sm:w-auto">
                Disabled
              </Button>
            </div>
          </Card>
        </section>

        {/* ------------------------------------------------------------
            INPUTS — EXACT MATCH TO ADD DRIVER + EDIT PROFILE
        ------------------------------------------------------------ */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Inputs</h2>

          <Card
            className="w-full rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
            style={{
              background: "white",
              padding: 0,
            }}
          >
            {/* BLUE HEADER BAR — FLUSH, NO WHITE CORNERS */}
            <div
              className="px-5 py-3"
              style={{ background: brand, color: "white" }}
            >
              <h2 className="text-base font-semibold">Form Inputs</h2>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-6">

              <Input label="First Name" value="" onChange={() => {}} required />

              <Input label="Last Name" value="" onChange={() => {}} required />

              {/* ⭐ NEW: TEXTAREA — OFFICIAL STYLE GUIDE VERSION */}
              <Textarea
                label="About (Textarea)"
                value=""
                onChange={() => {}}
                style={{ minHeight: "90px" }}
              />

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" />
                Junior Driver
              </label>

              <Button className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                Submit
              </Button>
            </div>
          </Card>
        </section>

        {/* ------------------------------------------------------------
            CARDS — EXACT HEADER STYLE FROM EDIT PROFILE
        ------------------------------------------------------------ */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Cards</h2>

          {/* Standard Card */}
          <Card
            className="p-4"
          >
            <p className="font-medium">Standard Card</p>
            <p className="text-sm text-gray-600">This is a standard card.</p>
          </Card>

          {/* Card with Header — PERFECT MATCH */}
          <Card
            className="w-full rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
            style={{
              background: "white",
              padding: 0,
            }}
          >
            <div
              className="px-5 py-3"
              style={{ background: brand, color: "white" }}
            >
              <h2 className="text-base font-semibold">Card with Header</h2>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600">
                This card uses the exact header style from Edit Profile.
              </p>
            </div>
          </Card>

          {/* Delete Confirmation Card */}
          <Card
            className="p-6 space-y-4 bg-red-50"
          >
            <h3 className="text-lg font-semibold text-red-700">
              Delete Confirmation
            </h3>
            <p>Are you sure you want to delete this item?</p>

            <div className="flex gap-3">
              <Button className="bg-red-600 text-white hover:bg-red-700">
                Delete
              </Button>
              <Button variant="secondary">Cancel</Button>
            </div>
          </Card>
        </section>

        {/* ------------------------------------------------------------
            TYPOGRAPHY
        ------------------------------------------------------------ */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Typography</h2>

          <Card
            className="p-4 space-y-3"
          >
            <h1 className="text-2xl font-bold">Heading 1</h1>
            <h2 className="text-xl font-semibold">Heading 2</h2>
            <h3 className="text-lg font-semibold">Heading 3</h3>
            <p className="text-base">Body text example.</p>
            <p className="text-sm text-gray-600">Muted text example.</p>
          </Card>
        </section>

      </main>
    </div>
  );
}
