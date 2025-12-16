import { useEffect, useState } from "react";
import axios from "axios";
import "./index.css"; 

const API = "http://localhost:5000";

export default function App() {
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState("");

  const load = async () => setImages((await axios.get(`${API}/images`)).data);
  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const fd = new FormData();
    fd.append("image", e.target.files[0]);
    await axios.post(`${API}/upload`, fd);
    load();
  };

  const search = async () => setImages((await axios.get(`${API}/search?q=${query}`)).data);
  const del = async (name) => { await axios.delete(`${API}/${name}`); load(); };
  const download = (name) => window.open(`${API}/download/${name}`);

  return (
    <div className="container">
      <h2 className="title">📸 Image Manager</h2>

      <div className="controls">
        <input type="file" onChange={upload} className="file-input" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="search-input"
        />
        <button onClick={search} className="btn search-btn">Search</button>
      </div>

      <div className="image-grid">
        {images.map((img) => (
          <div key={img.name} className="image-card">
            <img src={`${API}${img.url}`} alt={img.name} className="image" />
            <p className="image-name">{img.name}</p>
            <div className="image-actions">
              <button onClick={() => download(img.name)} className="btn download-btn">Download</button>
              <button onClick={() => del(img.name)} className="btn delete-btn">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
