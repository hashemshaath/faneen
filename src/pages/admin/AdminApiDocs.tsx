import { Navigate } from 'react-router-dom';

// API Docs merged into API Settings page — redirect
const AdminApiDocs = () => <Navigate to="/admin/api-settings" replace />;

export default AdminApiDocs;
