# BigQuery Release Notes Explorer & Tweet Compiler

A sleek, responsive, and modern dashboard built to parse Google Cloud BigQuery's release notes XML feed, group daily logs into individual updates, and compile updates into Twitter/X drafts with real-time length limit checks.

---

## 🌟 Key Features

- **Atom XML Parser & HTML Slicer**: Slices Google's daily bulk feed updates into individual, distinct cards categorized by type (Feature, Announcement, Issue, Deprecation).
- **Stale-on-Error Fallback Cache**: Caches feed entries for up to 1 hour on the backend. If a feed fetch fails due to connectivity or server limits, it automatically falls back to returning the cache to maintain a working interface.
- **Ocean Onyx Dark UI**: A modern CSS theme using dark blue/gray tones, linear gradients, animated background glows, responsive layouts, and custom scrollbars.
- **Instant Client-Side Filtering**: Live search indexing and category filters let you isolate logs in real time.
- **Interactive Tweet Composer**: 
  - **Quick Share**: Tweet any single card immediately.
  - **Multi-Select Draft Compiler**: Select multiple updates using checkboxes to compile a bulleted summary.
  - **Progress Monitor**: Features a circular SVG progress ring checking the character limit boundaries (280 characters max) and changing colors (blue, orange, red) to alert the user of character limits.
  - **Post Dispatcher**: Dispatches drafts directly to the official Twitter/X web intent endpoint.

---

## 🛠️ Technology Stack

- **Backend**: Python, Flask, Requests, XML ElementTree, BeautifulSoup4
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom HSL color system), Vanilla JavaScript (ES6 Modules)
- **Typography & Icons**: Google Fonts (Inter + Outfit), Inline SVGs
- **Deployment & Versioning**: Git, .gitignore configured

---

## 📂 Project Structure

```text
bq-releases-notes/
│
├── .venv/                  # Python Virtual Environment (ignored in git)
├── .gitignore              # Defines files to ignore in Git
├── app.py                  # Main Flask application (routes & parsing engine)
├── requirements.txt        # Python package dependencies
│
├── templates/
│   └── index.html          # Shell layout structure & Tweet composer markup
│
└── static/
    ├── app.js              # State manager, timeline compiler, search/filters
    └── style.css           # Glassmorphic dark styling & visual layout
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3.10+ installed on your computer.

### 1. Set Up the Virtual Environment
Navigate to the project root and create a local virtual environment:

**On Windows (Powershell):**
```powershell
python -m venv .venv
.venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
Install Flask, requests, and BeautifulSoup:
```bash
pip install -r requirements.txt
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```

The application will start in debug mode at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📡 API Reference

### Get Release Notes
Returns the sorted parsed list of release notes.

- **URL**: `/api/release-notes`
- **Method**: `GET`
- **Query Parameters**:
  - `refresh=true` (Optional: Bypasses the cache and fetches live data from Google Cloud).
- **Response Format**: `JSON`
- **Sample Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "last_updated": 1781912400,
    "updates": [
      {
        "id": "tag:google.com,2016:bigquery-release-notes#June_17_2026_0_feature",
        "date": "June 17, 2026",
        "updated": "2026-06-17T00:00:00-07:00",
        "type": "Feature",
        "content": "<p>You can enable autonomous embedding...</p>",
        "text_content": "You can enable autonomous embedding...",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026"
      }
    ]
  }
  ```

---

## 📝 License
This project is open-source and available under the MIT License.
