import { useState } from "react";
import * as XLSX from "xlsx";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [villeFilters, setVilleFilters] = useState([]);
  const [dFilters, setDFilters] = useState([]);
  const [dFilterMode, setDFilterMode] = useState("avec-autres"); // "exact" ou "avec-autres"

  const parseColonne1 = (text = "") => {
    const lignes = text.split("\n").map(l => l.trim()).filter(Boolean);
    const titre = lignes[0] || "";
    const lieu  = lignes[1] || "";
    const ligneVilleTel = lignes[2] || "";
    const ligneFax = lignes[3] || "";

    const villeMatch = ligneVilleTel.match(/Ville\s*:\s*(.*?)-\s*T[ée]l\s*:\s*([^-\n]*)/i);
    const ville = villeMatch ? villeMatch[1].trim() : "";
    const tel   = villeMatch ? villeMatch[2].trim() : "";

    const faxMatch = ligneFax.match(/Fax\s*:\s*(.*)/i);
    const fax = faxMatch ? faxMatch[1].trim() : "";

    return { titre, lieu, ville, tel, fax };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const binaryStr = evt.target.result;
      const wb = XLSX.read(binaryStr, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const mapped = rows
        .slice(1)
        .filter(r => r[1])
        .map((r) => {
          const col1 = r[1] || "";
          const dRaw = r[2] || "";
          const matricule = r[3] || "";

          const { titre, lieu, ville, tel, fax } = parseColonne1(col1);

          const dList = dRaw
            .split(",")
            .map(x => x.trim())
            .filter(Boolean);

          return { titre, lieu, ville, tel, fax, dRaw, dList, matricule };
        });

      setData(mapped);
    };
    reader.readAsBinaryString(file);
  };

  const villes = Array.from(new Set(data.map(r => r.ville).filter(Boolean)));
const dOptions = Array.from(new Set(data.flatMap(r => r.dList))).sort((a, b) => {
  // Extraire le numéro de D3(P) → 3, D14(D) → 14
  const numA = parseInt(a.match(/\d+/)?.[0] || "0");
  const numB = parseInt(b.match(/\d+/)?.[0] || "0");
  return numA - numB;
});

  const toggleVille = (ville) => {
    setVilleFilters(prev =>
      prev.includes(ville) ? prev.filter(v => v !== ville) : [...prev, ville]
    );
  };

  const toggleD = (d) => {
    setDFilters(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const removeVille = (ville) => {
    setVilleFilters(prev => prev.filter(v => v !== ville));
  };

  const removeD = (d) => {
    setDFilters(prev => prev.filter(x => x !== d));
  };

  const filtered = data.filter(r => {
    // Filtre par ville
    const villeMatch = villeFilters.length === 0 || villeFilters.includes(r.ville);
    
    // Filtre par D selon le mode
    let dMatch = true;
    if (dFilters.length > 0) {
      if (dFilterMode === "exact") {
        // Mode exact: doit contenir UNIQUEMENT les D sélectionnés
        dMatch = r.dList.length === dFilters.length && 
                 r.dList.every(d => dFilters.includes(d));
      } else {
        // Mode avec-autres: doit contenir AU MOINS les D sélectionnés (peut avoir d'autres)
        dMatch = dFilters.every(d => r.dList.includes(d));
      }
    }
    
    return villeMatch && dMatch;
  });

  return (
    <div className="app-container">
      <h1>Gestion des Bureaux d'Études</h1>
      
      <div className="file-upload">
        <label htmlFor="file-input" className="file-label">
          Choisir un fichier
        </label>
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
        />
        {data.length > 0 && <span className="file-info">{data.length} entrées chargées</span>}
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Villes</label>
          <div className="tags-container">
            {villeFilters.map(v => (
              <span key={v} className="tag tag-selected">
                {v}
                <button onClick={() => removeVille(v)}>×</button>
              </span>
            ))}
          </div>
          <div className="options-list">
            {villes.map(v => (
              <button
                key={v}
                className={`option-btn ${villeFilters.includes(v) ? "active" : ""}`}
                onClick={() => toggleVille(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Catégories D</label>
          
          <div className="filter-mode">
            <label className="radio-label">
              <input
                type="radio"
                name="dMode"
                value="avec-autres"
                checked={dFilterMode === "avec-autres"}
                onChange={(e) => setDFilterMode(e.target.value)}
              />
              <span>  Contient ces D + autres possibles</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="dMode"
                value="exact"
                checked={dFilterMode === "exact"}
                onChange={(e) => setDFilterMode(e.target.value)}
              />
              <span>  Contient uniquement ces D</span>
            </label>
          </div>

          <div className="tags-container">
            {dFilters.map(d => (
              <span key={d} className="tag tag-selected">
                {d}
                <button onClick={() => removeD(d)}>×</button>
              </span>
            ))}
          </div>
          <div className="options-list">
            {dOptions.map(d => (
              <button
                key={d}
                className={`option-btn ${dFilters.includes(d) ? "active" : ""}`}
                onClick={() => toggleD(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Lieu</th>
              <th>Ville</th>
              <th>Tél</th>
              <th>Fax</th>
              <th>D</th>
              <th>Matricule</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td>{r.titre}</td>
                <td>{r.lieu}</td>
                <td>{r.ville}</td>
                <td>{r.tel}</td>
                <td>{r.fax}</td>
                <td>{r.dRaw}</td>
                <td>{r.matricule}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && data.length > 0 && (
          <p className="no-results">Aucun résultat trouvé</p>
        )}
      </div>
    </div>
  );
}

export default App;
