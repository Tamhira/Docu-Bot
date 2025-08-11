import { useEffect, useState } from "react";
import axios from "axios";
import { Trash2 } from "lucide-react";

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/docs/documents");
        setDocuments(res.data.documents || []);
      } catch (error) {
        alert(
          "Failed to fetch documents: " +
            (error.response?.data?.error || error.message)
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;
    try {
      await axios.delete("http://localhost:5000/api/docs/delete", {
        data: { filename }
      });
      setDocuments((prev) => prev.filter((doc) => doc.filename !== filename));
    } catch (error) {
      alert(
        "Failed to delete document: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  return (
    <div className="h-[calc(100vh-65px)] bg-[#0B1620] text-white flex flex-col items-center px-4 pt-10">
      <div className="w-3/5 mx-auto">
        <h2 className="text-3xl font-semibold text-white mb-6">Documents</h2>

        <div className="overflow-x-auto rounded-lg border border-gray-700">
          {loading ? (
            <p className="text-center text-gray-400 p-4">
              Loading documents...
            </p>
          ) : documents.length === 0 ? (
            <p className="text-center text-gray-400 p-4">No documents found.</p>
          ) : (
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="bg-[#0F1E2F] text-gray-400 text-sm uppercase">
                <tr>
                  <th className="px-6 py-3">File Name</th>
                  <th className="px-6 py-3">Uploaded On</th>
                  <th className="px-6 py-3">Chunks</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, idx) => (
                  <tr
                    key={doc.filename} // better unique key
                    className="border-t border-gray-700 hover:bg-[#152232] transition"
                  >
                    <td className="px-6 py-4">{doc.filename}</td>
                    <td className="px-6 py-4">
                      {new Date(doc.uploadTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">{doc.totalChunks}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(doc.filename)}
                        className="text-red-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Documents;
