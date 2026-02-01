import { useEffect, useRef } from "react";
import "./App.css";
import { useState } from "react";
import { QRious } from "react-qrious";
import JSZip from "jszip";
import { PacmanLoader } from "react-spinners";

function App() {
  // input csv file
  const [file, setFile] = useState();

  // name column
  const [nameCol, setNameCol] = useState(2);

  // names e.g. ["Dr Ajit K Yadav", ....]
  const [names, setNames] = useState([]);

  // card urls e.g. ["https://tapvcard.com/dr-ajit-k-yadav", ....]
  const [urls, setUrls] = useState([]);

  // qr imgs ref
  const qrRef = useRef();

  // download button
  const downloadRef = useRef();

  // ready to download
  const [ready, setReady] = useState(false);

  // prefix of card urls
  const [domain, setDomain] = useState("https://tapvcard.com/");

  // custom prefix of card urls
  const [customDomain, setCustomDomain] = useState(false);

  // dropdown domain list
  const domainList = ["https://tapvcard.com/", "https://tapvcard.in/", "custom"];

  const [loading, setLoading] = useState(false);

  // reading csv file and seperating names and generating urls
  useEffect(() => {
    if (!file) return;

    setLoading(true);

    // file reader
    const fileReader = new FileReader();

    // read file (csv) as text
    fileReader.readAsText(file);

    // when file is read
    fileReader.addEventListener("load", async (e) => {
      // csv output
      const csv = fileReader.result;
      // console.log(csv)

      // line seperation e.g. ["Dr Ajit K Yadav,yadavajitdr@gmail.com,+91 9654466159", ....]
      const lines = csv.split("\n");
      // console.log(lines)

      // keyword seperation e.g. ["Dr Ajit K Yadav", "yadavajitdr@gmail.com", "+91 9654466159", ....]
      const columns = lines.map((row) => row.split(","));
      // console.log(columns)

      // names e.g. ["Dr Ajit K Yadav", ....]
      const names = columns.map((cells) => cells[(nameCol - 1) || 1]);
      // console.log(names)

      // URI friendly Names e.g. ["dr-ajit-k-yadav", ....]
      const URINames = names.map((name) =>
        name.toLowerCase().replace(/[\s.]+/g, " ").trim().split(" ").join("-")
      );

      // remove . at the end of names
      for (let i = 0; i < names.length; i++) {
        if (names[i].charAt(names[i].length - 1) === ".") {
          if (names[i].charAt(names[i].length - 2) === " ") {
            names[i] = names[i].slice(0, -2);
          } else {
          names[i] = names[i].slice(0, -1);
          }
        }
      }

      // prevent duplicate names
      let counts = {};  // Object to track occurrences of each name
      for (let i = 0; i < URINames.length; i++) {
          let item = URINames[i];
          if (counts[item]) {
            counts[item]++;  // Increment count if item has been seen before
            URINames[i] = `${item}-${counts[item]}`;  // Modify the item with the count
            names[i] = `${item} ${counts[item]}`;  // Modify the item with the count
          } else {
            counts[item] = 1;  // Initialize the count for the first occurrence
          }
      }
      
      setNames(names);

      // change 'throttle:60,1' in api group of $middlewareGroups property in app/Http/Kernel.php file to -> 'throttle:1000000,0.5'
      if (domain.includes('https://tapvcard.com/')) {
        let path = undefined;
        if (customDomain) {
          const url = new URL(domain);
          path = url.pathname.replace('/', '');
        }
        for (let i = 0; i < URINames.length; i++) {
          const name = URINames[i];
          try {
            const response = await fetch(path ? `https://tapvcard.com/api/checkCardUrl?url=${path}${name}` : `https://tapvcard.com/api/checkCardUrl?url=${name}`);
            if(!response.ok) {
              console.error('checkCardUrl failed for', name, 'response:', response);
            }
            const data = await response.json();
            console.log(`uri:${name} data: ${data.exist ? 'exists' : 'available'}`);
            if (!data.exist) continue;
            let n = 1;
            while (true) {
              const response2 = await fetch(path ? `https://tapvcard.com/api/checkCardUrl?url=${path}${name}-${n}` : `https://tapvcard.com/api/checkCardUrl?url=${name}-${n}`);
              if(!response.ok) {
                console.error('checkCardUrl failed for', name, 'response:', response2);
              }
              const data2 = await response2.json();
              console.log(`uri:${name}-${n} data: ${data2.exist ? 'exists' : 'available'}`);
              if (!data2.exist) {
                URINames[i] = `${name}-${n}`;
                break;
              }
              n++;
            }
          } catch (err) {
            console.error('checkCardUrl failed for', name, err);
            continue;
          }
        }
      }

      // card urls e.g. ["https://tapvcard.com/dr-ajit-k-yadav", ....]
      const urls = URINames.map((name) => `${domain}${name}`);
      setUrls(urls);

      setReady(false);
      downloadRef.current?.removeAttribute("href");
      setLoading(false);
    });
  }, [file]);

  // downloading qr codes
  function download() {
    if (ready) return;

    downloadRef.current.textContent = "processing...";

    // zip file creation
    const zip = new JSZip();

    // Qrs folder creation in zip
    const Qrs = zip.folder("Qrs");

    // uploading qr images to Qrs folder
    Array.from(qrRef.current.children).forEach((img, i) => {
      // baase64 string of qr code
      const base64Qr = img.children[1].src.split(",")[1];

      // adding qr code to Qrs folder
      Qrs.file(`${names[i]}.png`, base64Qr, { base64: true });
    });

    // zip file creation
    zip.generateAsync({ type: "blob" }).then((content) => {
      const downloadUrl = URL.createObjectURL(content);
      downloadRef.current.href = downloadUrl;
      downloadRef.current.download = "QRs.zip";
      setReady(true); // ready for download
    });
    
  }

  return (
    <main>
      <h1>bulk QRs generator</h1>
      <div id="qrs" style={{marginBottom: urls.length === 0 && "7rem"}}>
      {/* file input */}
      <input
        type="file"
        name="fileInp"
        id="fileInp"
        onChange={(e) => setFile(e.target.files[0])}
        accept=".csv"
      />
      {/* name column */}
      <label htmlFor="colInp">Column Of Name:</label>
      <input type="number" name="colInp" id="colInp" placeholder="default is 2nd coloumn" onChange={(e) => setNameCol(parseInt(e.target.value))}/>

      {/* prefix url input */}
      <label htmlFor="domainList">URL Prefix:</label>
      <select name="domainSelect" id="domainList" onChange={(e) => e.target.value === 'custom' ? setCustomDomain('custom') : setDomain(e.target.value)}>
        {domainList.map((domain) => (
          <option value={domain}>{domain}</option>
        ))}
      </select>
      { customDomain &&
      <input type="url" name="domainInput" id="domainInput" placeholder="Enter domain ex- https://example.com/" onChange={(e) => setDomain(e.target.value)} />
      }

      {loading && <PacmanLoader />}
      {/* card urls */}
      <ol ref={qrRef}>
        {urls.map((url) => (
          <li>
            <h2>{url}</h2>
            <QRious size={300} padding={18} value={url}/>
          </li>
        ))}
      </ol>
      </div>
      {/* QR download button */}
      {urls.length !== 0 && <a ref={downloadRef} onClick={download}>
        {ready ? "Download QRs" : "Generate QRs"}
      </a>}
    </main>
  );
}

export default App;
