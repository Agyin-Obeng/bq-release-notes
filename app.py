import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache configuration: default cache duration is 1 hour (3600 seconds)
CACHE_DURATION = 3600
cache = {
    'data': None,
    'last_updated': 0,
    'status': 'empty'
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        # Fetch the XML feed
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        xml_content = response.text
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None
        
    try:
        root = ET.fromstring(xml_content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        all_updates = []
        
        # Parse Atom feed entry elements
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text
            updated_str = entry.find('atom:updated', ns).text
            
            link_el = entry.find('atom:link[@rel="alternate"]', ns)
            base_link = link_el.attrib['href'] if link_el is not None else ""
            
            content_el = entry.find('atom:content', ns)
            if content_el is None or not content_el.text:
                continue
                
            content_html = content_el.text
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Find subheaders inside the entry content HTML (e.g. h3 or h4 tags)
            headers = soup.find_all(['h3', 'h4'])
            
            if not headers:
                # Fallback: if there are no headings, treat the entire block as a single "Update"
                text_content = soup.get_text().strip()
                text_content = " ".join(text_content.split())
                all_updates.append({
                    'id': entry.find('atom:id', ns).text + "_full",
                    'date': date_str,
                    'updated': updated_str,
                    'type': 'Update',
                    'content': str(soup),
                    'text_content': text_content,
                    'link': base_link
                })
                continue
                
            for idx, header in enumerate(headers):
                u_type = header.get_text().strip()
                
                # Retrieve sibling tags until the next header tag
                sibling_content = []
                sibling = header.next_sibling
                while sibling and sibling.name not in ['h3', 'h4']:
                    sibling_content.append(sibling)
                    sibling = sibling.next_sibling
                
                # Combine sibling nodes back to HTML
                html_str = "".join(str(s) for s in sibling_content).strip()
                content_soup = BeautifulSoup(html_str, 'html.parser')
                
                # Get plain text for sharing
                text_content = content_soup.get_text().strip()
                text_content = " ".join(text_content.split())
                
                # Generate unique ID for front-end selection state
                entry_id = entry.find('atom:id', ns).text
                update_id = f"{entry_id}_{idx}_{u_type.lower().replace(' ', '_')}"
                
                # Check for header anchor link ID
                header_id = header.get('id')
                link = base_link
                if header_id:
                    link = f"{base_link.split('#')[0]}#{header_id}"
                
                all_updates.append({
                    'id': update_id,
                    'date': date_str,
                    'updated': updated_str,
                    'type': u_type,
                    'content': html_str,
                    'text_content': text_content,
                    'link': link
                })
                
        # Sort updates by updated timestamp descending
        all_updates.sort(key=lambda x: x.get('updated', ''), reverse=True)
        return all_updates
        
    except Exception as e:
        print(f"Error parsing feed: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or cache['data'] is None or (now - cache['last_updated']) > CACHE_DURATION:
        print("Fetching and parsing release notes from source...")
        data = fetch_and_parse_feed()
        if data is not None:
            cache['data'] = data
            cache['last_updated'] = now
            cache['status'] = 'success'
        else:
            if cache['data'] is not None:
                # Use cached data as stale-on-error fallback
                return jsonify({
                    'status': 'fallback',
                    'last_updated': cache['last_updated'],
                    'updates': cache['data'],
                    'message': 'Unable to fetch new release notes. Showing cached data.'
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Failed to download and parse release notes.'
                }), 500
                
    return jsonify({
        'status': 'success',
        'last_updated': cache['last_updated'],
        'updates': cache['data']
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
