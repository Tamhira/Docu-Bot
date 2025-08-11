import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Home() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!files.length) return alert("Please select at least one file.");

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      setUploading(true);
      setUploaded(false); // reset in case of re-upload
      await axios.post("http://localhost:5000/api/docs/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploading(false);
      setUploaded(true);
      alert("Upload successful!");
      setFiles([]); // clear after upload
    } catch (err) {
      setUploading(false);
      alert("Upload failed: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="h-[calc(100vh-65px)] bg-[#0B1620] text-white flex flex-col items-center px-4 pt-10">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-semibold mb-2">Upload your files</h1>
        <p className="text-gray-400 mb-6">
          Drag and drop your files here or browse from your computer
        </p>

        {/* Hidden file input */}
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
          className="hidden"
        />

        {/* Drag Drop Area */}
        <div className="w-full border border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 transition">
          
          <p className="text-gray-300 mb-2">Drag and drop your files here</p>
          <p className="text-gray-500 mb-4">Or</p>
          <button
            type="button"
            onClick={() => document.getElementById("file-upload").click()}
            className="px-4 py-2 bg-[#1E2A38] hover:bg-[#253344] rounded-md"
          >
            Browse files
          </button>
          {files.length > 0 ? (
            <ul className="text-gray-300 mt-4">
              {files.map((file, idx) => (
                <li key={idx} className="truncate">
                  {file.name}
                </li>
              ))}
            </ul>
          ) : (
            <>

            </>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`mt-6 w-full relative overflow-hidden text-white font-medium py-2 px-4 rounded-md transition ${uploading
            ? "cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600"
            }`}
        >
          {uploading && (
            <span className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 animate-moving"></span>
          )}
          <span className={uploading ? "relative z-10" : ""}>
            {uploading ? "Uploading..." : "Upload"}
          </span>
        </button>


        {/* Go to Chat Button (only after upload success) */}
        {uploaded && (
          <button
            onClick={() => navigate("/chat")}
            className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition"
          >
            Go to Chat
          </button>
        )}
      </div>
    </div>
  );
}

export default Home;
