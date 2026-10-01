import CMSPage from "@cms/CMSPage";
import CMSSectionHeader from "@cms/CMSSectionHeader";
import CMSButton from "@cms/CMSButton";

import { useTranslation } from "@/app/i18n/I18nContext";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SquaresPlusIcon,
} from "@heroicons/react/24/outline";

export default function ButtonTestPage() {
  const { t } = useTranslation();
  return (
    <CMSPage title="CMS Button Test">

      <CMSSectionHeader title="Grey Buttons + Sharp Icons" />

      <div className="flex flex-wrap gap-4 items-center">

        <CMSButton>
          <PencilSquareIcon className="w-4 h-4 text-blue-600" />
          Edit
        </CMSButton>

        <CMSButton>
          <PlusIcon className="w-4 h-4 text-green-600" />
          Add
        </CMSButton>

        <CMSButton>
          <ChevronDownIcon className="w-4 h-4 text-gray-600" />
          Expand
        </CMSButton>

        <CMSButton style={{ color: "#991B1B" }}>
          <TrashIcon className="w-4 h-4 text-red-600" />
          Delete
        </CMSButton>

      </div>

      <CMSSectionHeader title="Bulk + Collapse" />

      <div className="grid grid-cols-2 gap-3 w-[220px] mt-4">

        <CMSButton>
          <ChevronDownIcon className="w-4 h-4 text-gray-600" />
          Collapse
        </CMSButton>

        <CMSButton>
          <PlusIcon className="w-4 h-4 text-blue-600" />
          Add
        </CMSButton>

        <CMSButton>
          <SquaresPlusIcon className="w-4 h-4 text-blue-600" />
          Bulk
        </CMSButton>

        <CMSButton style={{ color: "#991B1B" }}>
          <TrashIcon className="w-4 h-4 text-red-600" />
          Delete
        </CMSButton>

      </div>

    </CMSPage>
  );
}
