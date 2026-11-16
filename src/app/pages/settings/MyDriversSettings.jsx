import { Navigate, useParams } from "react-router-dom";

/** Legacy route — driver and transponder management lives in Driver Manager. */
export default function MyDriversSettings() {
  const { clubSlug } = useParams();
  return <Navigate to={`/${clubSlug}/app/profile/drivers`} replace />;
}