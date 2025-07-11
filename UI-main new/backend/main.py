import os
import io
import re
import csv
import json
import time
import traceback
import warnings
import requests
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fpdf import FPDF
from docx import Document
from dotenv import load_dotenv
from atlassian import Confluence
import google.generativeai as genai
from bs4 import BeautifulSoup
from io import BytesIO
import difflib
import base64

# Load environment variables
load_dotenv()

app = FastAPI(title="Confluence AI Assistant API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "https://finalui-nx6r.onrender.com",  # Add your Render URL
        "https://finalui-frontend.onrender.com",  # Add frontend domain
        "*"  # For development, you can allow all origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get API key from environment
GEMINI_API_KEY = os.getenv("GENAI_API_KEY_1") or os.getenv("GENAI_API_KEY_2")
if not GEMINI_API_KEY:
    raise ValueError("No Gemini API key found in environment variables. Please set GENAI_API_KEY_1 or GENAI_API_KEY_2 in your .env file.")

# Configure Gemini AI
genai.configure(api_key=GEMINI_API_KEY)

# Pydantic models for request/response
class SearchRequest(BaseModel):
    space_key: str
    page_titles: List[str]
    query: str

class VideoRequest(BaseModel):
    video_url: Optional[str] = None
    space_key: str
    page_title: str
    question: Optional[str] = None

class CodeRequest(BaseModel):
    space_key: str
    page_title: str
    instruction: str
    target_language: Optional[str] = None

class ImpactRequest(BaseModel):
    space_key: str
    old_page_title: str
    new_page_title: str
    question: Optional[str] = None

class TestRequest(BaseModel):
    space_key: str
    code_page_title: str
    test_input_page_title: Optional[str] = None
    question: Optional[str] = None

class ImageRequest(BaseModel):
    space_key: str
    page_title: str
    image_url: str

class ImageSummaryRequest(BaseModel):
    space_key: str
    page_title: str
    image_url: str
    summary: str
    question: str

class ChartRequest(BaseModel):
    space_key: str
    page_title: str
    image_url: str
    chart_type: str
    filename: str
    format: str

class ExportRequest(BaseModel):
    content: str
    format: str
    filename: str

class SaveToConfluenceRequest(BaseModel):
    space_key: Optional[str] = None
    page_title: str
    content: str

# Helper functions
def remove_emojis(text):
    emoji_pattern = re.compile(
        "["
        u"\U0001F600-\U0001F64F"
        u"\U0001F300-\U0001F5FF"
        u"\U0001F680-\U0001F6FF"
        u"\U0001F1E0-\U0001F1FF"
        "]+", flags=re.UNICODE)
    no_emoji = emoji_pattern.sub(r'', text)
    return no_emoji.encode('latin-1', 'ignore').decode('latin-1')

def clean_html(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text(separator="\n")

def init_confluence():
    try:
        return Confluence(
            url=os.getenv('CONFLUENCE_BASE_URL'),
            username=os.getenv('CONFLUENCE_USER_EMAIL'),
            password=os.getenv('CONFLUENCE_API_KEY'),
            timeout=10
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Confluence initialization failed: {str(e)}")

# Export functions
def create_pdf(text):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Arial", size=12)
    for line in text.split('\n'):
        pdf.multi_cell(0, 10, line)
    return io.BytesIO(pdf.output(dest='S').encode('latin1'))

def create_docx(text):
    doc = Document()
    for line in text.split('\n'):
        doc.add_paragraph(line)
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer

def create_csv(text):
    output = io.StringIO()
    writer = csv.writer(output)
    for line in text.strip().split('\n'):
        writer.writerow([line])
    return io.BytesIO(output.getvalue().encode())

def create_json(text):
    return io.BytesIO(json.dumps({"response": text}, indent=4).encode())

def create_html(text):
    html = f"<html><body><pre>{text}</pre></body></html>"
    return io.BytesIO(html.encode())

def create_txt(text):
    return io.BytesIO(text.encode())


def extract_timestamps_from_summary(summary):
    timestamps = []
    lines = summary.splitlines()
    collecting = False
    for line in lines:
        if "**Timestamps:**" in line or "Timestamps:" in line:
            collecting = True
            continue
        if collecting:
            if not line.strip() or line.strip().startswith("**"):
                break
            # match lines like "* [00:00-00:05] sentence" or "[00:00-00:05] sentence"
            match = re.match(r"^\*?\s*\[(\d{1,2}:\d{2}-\d{1,2}:\d{2})\]\s*(.*)", line.strip())
            if match:
                timestamp_text = f"[{match.group(1)}] {match.group(2)}"
                timestamps.append(timestamp_text)
            elif line.strip().startswith("*") or line.strip().startswith("-"):
                # fallback for bullet points
                timestamps.append(line.strip().lstrip("* -").strip())
            elif line.strip():
                # fallback for any non-empty line
                timestamps.append(line.strip())
    return timestamps

def auto_detect_space(confluence, space_key: Optional[str] = None) -> str:
    if space_key:
        return space_key
    
    # Try to get space from environment variable
    env_space = os.getenv('DEFAULT_SPACE_KEY')
    if env_space:
        return env_space
    
    # Try to get first available space
    try:
        spaces = confluence.get_all_spaces(start=0, limit=1)
        if spaces and 'results' in spaces and spaces['results']:
            return spaces['results'][0]['key']
    except Exception as e:
        print(f"Warning: Could not auto-detect space: {e}")
    
    raise HTTPException(status_code=400, detail="No space key provided and could not auto-detect")

# API endpoints
@app.get("/")
async def root():
    return {"message": "Confluence AI Assistant API is running"}

@app.get("/spaces")
async def get_spaces():
    try:
        confluence = init_confluence()
        spaces = confluence.get_all_spaces(start=0, limit=100)
        space_list = []
        if 'results' in spaces:
            for space in spaces['results']:
                space_list.append({
                    "name": space['name'],
                    "key": space['key']
                })
        return {"spaces": space_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pages/{space_key}")
async def get_pages(space_key: Optional[str] = None):
    try:
        confluence = init_confluence()
        space_key = auto_detect_space(confluence, space_key)
        
        # Get pages from the space
        pages = confluence.get_all_pages_from_space(space_key, start=0, limit=100, status='current')
        page_titles = []
        if pages and 'results' in pages:
            for page in pages['results']:
                page_titles.append(page['title'])
        
        return {"pages": page_titles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def ai_powered_search(request: SearchRequest, req: Request):
    try:
        confluence = init_confluence()
        space_key = auto_detect_space(confluence, request.space_key)
        
        # Get content from specified pages
        all_content = ""
        pages_analyzed = 0
        
        for page_title in request.page_titles:
            try:
                page = confluence.get_page_by_title(space_key, page_title)
                if page:
                    content = page['body']['storage']['value']
                    clean_content = clean_html(content)
                    all_content += f"\n\n--- {page_title} ---\n{clean_content}"
                    pages_analyzed += 1
            except Exception as e:
                print(f"Warning: Could not fetch page '{page_title}': {e}")
                continue
        
        if not all_content.strip():
            raise HTTPException(status_code=404, detail="No content found in specified pages")
        
        # Prepare prompt for AI
        prompt = f"""You are an AI assistant analyzing Confluence pages. Based on the following content from {pages_analyzed} pages, please answer the user's query.

Content from Confluence pages:
{all_content}

User Query: {request.query}

Please provide a comprehensive and accurate response based on the content above. If the information is not available in the provided content, please state that clearly."""

        # Get response from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        return {
            "response": response.text,
            "pages_analyzed": pages_analyzed,
            "page_titles": request.page_titles
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video-summarizer")
async def video_summarizer(request: VideoRequest, req: Request):
    try:
        confluence = init_confluence()
        space_key = auto_detect_space(confluence, request.space_key)
        
        # Get content from the specified page
        page = confluence.get_page_by_title(space_key, request.page_title)
        if not page:
            raise HTTPException(status_code=404, detail=f"Page '{request.page_title}' not found")
        
        content = page['body']['storage']['value']
        clean_content = clean_html(content)
        
        # Extract video URLs from content
        video_urls = []
        soup = BeautifulSoup(content, 'html.parser')
        for link in soup.find_all('a', href=True):
            href = link['href']
            if any(domain in href.lower() for domain in ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com']):
                video_urls.append(href)
        
        # If no video URLs found in content, use the provided URL
        if not video_urls and request.video_url:
            video_urls = [request.video_url]
        
        if not video_urls:
            raise HTTPException(status_code=400, detail="No video URLs found in the page content")
        
        # Prepare prompt for video summarization
        video_url = video_urls[0]  # Use first video URL
        prompt = f"""You are an AI assistant that summarizes videos. Please analyze the following video and provide a comprehensive summary.

Video URL: {video_url}
Page Content Context: {clean_content[:1000]}  # First 1000 chars for context

User Question: {request.question if request.question else "Please provide a comprehensive summary of this video"}

Please provide:
1. A detailed summary of the video content
2. Key points and insights
3. Important quotes or statements
4. Timestamps for key moments (if applicable)
5. Any relevant context from the page content

Format your response in a clear, structured manner."""

        # Get response from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Extract timestamps from the response
        timestamps = extract_timestamps_from_summary(response.text)
        
        # Extract quotes (lines that might be quotes)
        lines = response.text.split('\n')
        quotes = []
        for line in lines:
            if line.strip().startswith('"') and line.strip().endswith('"'):
                quotes.append(line.strip())
            elif '"' in line and line.count('"') >= 2:
                # Extract text between quotes
                import re
                quote_matches = re.findall(r'"([^"]*)"', line)
                quotes.extend(quote_matches)
        
        # Generate Q&A pairs
        qa_prompt = f"""Based on the video summary below, generate 5 relevant questions and answers:

{response.text}

Please format as:
Q: [Question]
A: [Answer]

Q: [Question]
A: [Answer]
..."""

        qa_response = model.generate_content(qa_prompt)
        
        # Parse Q&A pairs
        qa_pairs = []
        lines = qa_response.text.split('\n')
        current_q = None
        current_a = None
        
        for line in lines:
            line = line.strip()
            if line.startswith('Q:'):
                if current_q and current_a:
                    qa_pairs.append({"question": current_q, "answer": current_a})
                current_q = line[2:].strip()
                current_a = None
            elif line.startswith('A:') and current_q:
                current_a = line[2:].strip()
        
        if current_q and current_a:
            qa_pairs.append({"question": current_q, "answer": current_a})
        
        return {
            "summary": response.text,
            "quotes": quotes[:10],  # Limit to 10 quotes
            "timestamps": timestamps,
            "qa": qa_pairs,
            "page_title": request.page_title,
            "answer": response.text if request.question else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/code-assistant")
async def code_assistant(request: CodeRequest, req: Request):
    try:
        confluence = init_confluence()
        space_key = auto_detect_space(confluence, request.space_key)
        
        # Get content from the specified page
        page = confluence.get_page_by_title(space_key, request.page_title)
        if not page:
            raise HTTPException(status_code=404, detail=f"Page '{request.page_title}' not found")
        
        content = page['body']['storage']['value']
        clean_content = clean_html(content)
        
        # Extract code blocks from content
        code_blocks = []
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find code blocks in <pre> tags
        for pre in soup.find_all('pre'):
            code_blocks.append(pre.get_text())
        
        # Find code blocks in <code> tags
        for code in soup.find_all('code'):
            if code.parent.name != 'pre':  # Avoid duplicates
                code_blocks.append(code.get_text())
        
        if not code_blocks:
            raise HTTPException(status_code=400, detail="No code blocks found in the page content")
        
        # Combine all code blocks
        all_code = "\n\n".join(code_blocks)
        
        # Detect programming language
        def detect_language_from_content(content: str) -> str:
            # Simple language detection based on keywords
            content_lower = content.lower()
            if 'def ' in content_lower or 'import ' in content_lower or 'class ' in content_lower:
                return 'python'
            elif 'function ' in content_lower or 'var ' in content_lower or 'const ' in content_lower:
                return 'javascript'
            elif 'public class' in content_lower or 'private ' in content_lower:
                return 'java'
            elif '#include' in content_lower or 'int main' in content_lower:
                return 'cpp'
            elif '<?php' in content_lower:
                return 'php'
            elif '<html' in content_lower or '<div' in content_lower:
                return 'html'
            elif 'SELECT' in content.upper() or 'INSERT' in content.upper():
                return 'sql'
            else:
                return 'unknown'
        
        detected_language = detect_language_from_content(all_code)
        
        # Prepare prompt for code assistance
        prompt = f"""You are an AI code assistant. Please help with the following code-related request.

Code from Confluence page:
```{detected_language}
{all_code}
```

User Instruction: {request.instruction}

Detected Language: {detected_language}
Target Language: {request.target_language if request.target_language else 'same as original'}

Please provide:
1. A summary of what the code does
2. Analysis of the code structure and logic
3. Suggestions for improvement (if applicable)
4. Modified code based on the user's instruction (if applicable)
5. Code converted to the target language (if different from original)

Format your response clearly and include code blocks with proper syntax highlighting."""

        # Get response from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Extract modified code and converted code from response
        modified_code = None
        converted_code = None
        
        # Simple extraction of code blocks from response
        lines = response.text.split('\n')
        in_code_block = False
        current_code = []
        code_blocks_found = []
        
        for line in lines:
            if line.strip().startswith('```'):
                if in_code_block:
                    code_blocks_found.append('\n'.join(current_code))
                    current_code = []
                in_code_block = not in_code_block
            elif in_code_block:
                current_code.append(line)
        
        if code_blocks_found:
            if len(code_blocks_found) >= 2:
                modified_code = code_blocks_found[0]
                converted_code = code_blocks_found[1]
            else:
                modified_code = code_blocks_found[0]
        
        return {
            "summary": response.text,
            "original_code": all_code,
            "detected_language": detected_language,
            "modified_code": modified_code,
            "converted_code": converted_code,
            "target_language": request.target_language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/impact-analyzer")
async def impact_analyzer(request: ImpactRequest, req: Request):
    try:
        confluence = init_confluence()
        space_key = auto_detect_space(confluence, request.space_key)
        
        # Get content from both pages
        old_page = confluence.get_page_by_title(space_key, request.old_page_title)
        new_page = confluence.get_page_by_title(space_key, request.new_page_title)
        
        if not old_page:
            raise HTTPException(status_code=404, detail=f"Old page '{request.old_page_title}' not found")
        if not new_page:
            raise HTTPException(status_code=404, detail=f"New page '{request.new_page_title}' not found")
        
        old_content = clean_html(old_page['body']['storage']['value'])
        new_content = clean_html(new_page['body']['storage']['value'])
        
        # Create diff
        def extract_content(content):
            # Remove common formatting and extract meaningful content
            lines = content.split('\n')
            meaningful_lines = []
            for line in lines:
                line = line.strip()
                if line and len(line) > 10:  # Only lines with substantial content
                    meaningful_lines.append(line)
            return meaningful_lines
        
        old_lines = extract_content(old_content)
        new_lines = extract_content(new_content)
        
        # Calculate basic metrics
        lines_added = len([line for line in new_lines if line not in old_lines])
        lines_removed = len([line for line in old_lines if line not in new_lines])
        files_changed = 1  # Single page change
        
        total_lines = len(old_lines) + len(new_lines)
        percentage_change = (lines_added + lines_removed) / total_lines * 100 if total_lines > 0 else 0
        
        # Create diff using difflib
        diff = difflib.unified_diff(
            old_lines, new_lines,
            fromfile=request.old_page_title,
            tofile=request.new_page_title,
            lineterm=''
        )
        diff_text = '\n'.join(diff)
        
        # Prepare prompt for impact analysis
        prompt = f"""You are an AI assistant analyzing the impact of changes between two versions of a document.

Old Page: {request.old_page_title}
New Page: {request.new_page_title}

Changes Summary:
- Lines added: {lines_added}
- Lines removed: {lines_removed}
- Files changed: {files_changed}
- Percentage change: {percentage_change:.2f}%

Diff:
{diff_text}

User Question: {request.question if request.question else "Please analyze the impact of these changes"}

Please provide:
1. Impact Analysis: What are the key changes and their implications?
2. Recommendations: What should be considered or done next?
3. Risk Analysis: What potential risks or issues might arise?
4. Risk Level: Low/Medium/High
5. Risk Score: 1-10
6. Risk Factors: List specific factors that contribute to the risk level

Format your response clearly and provide actionable insights."""

        # Get response from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Extract risk information from response
        risk_level = "Medium"
        risk_score = 5
        risk_factors = []
        
        response_text = response.text.lower()
        if "high risk" in response_text or "risk level: high" in response_text:
            risk_level = "High"
            risk_score = 8
        elif "low risk" in response_text or "risk level: low" in response_text:
            risk_level = "Low"
            risk_score = 2
        
        # Extract risk factors (lines that might be risk factors)
        lines = response.text.split('\n')
        for line in lines:
            line = line.strip()
            if line and any(keyword in line.lower() for keyword in ['risk', 'issue', 'problem', 'concern', 'impact']):
                risk_factors.append(line)
        
        return {
            "lines_added": lines_added,
            "lines_removed": lines_removed,
            "files_changed": files_changed,
            "percentage_change": percentage_change,
            "impact_analysis": response.text,
            "recommendations": response.text,  # Could be extracted separately
            "risk_analysis": response.text,  # Could be extracted separately
            "risk_level": risk_level,
            "risk_score": risk_score,
            "risk_factors": risk_factors[:5],  # Limit to 5 factors
            "answer": response.text if request.question else None,
            "diff": diff_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-support")
async def test_support(request: TestRequest, req: Request):
    try:
        confluence = init_confluence()
        space_key = auto_detect_space(confluence, request.space_key)
        
        # Get content from the code page
        code_page = confluence.get_page_by_title(space_key, request.code_page_title)
        if not code_page:
            raise HTTPException(status_code=404, detail=f"Code page '{request.code_page_title}' not found")
        
        code_content = clean_html(code_page['body']['storage']['value'])
        
        # Get content from test input page if specified
        test_input_content = ""
        if request.test_input_page_title:
            test_input_page = confluence.get_page_by_title(space_key, request.test_input_page_title)
            if test_input_page:
                test_input_content = clean_html(test_input_page['body']['storage']['value'])
        
        # Extract code blocks from content
        code_blocks = []
        soup = BeautifulSoup(code_page['body']['storage']['value'], 'html.parser')
        
        # Find code blocks in <pre> tags
        for pre in soup.find_all('pre'):
            code_blocks.append(pre.get_text())
        
        # Find code blocks in <code> tags
        for code in soup.find_all('code'):
            if code.parent.name != 'pre':  # Avoid duplicates
                code_blocks.append(code.get_text())
        
        if not code_blocks:
            raise HTTPException(status_code=400, detail="No code blocks found in the code page")
        
        # Combine all code blocks
        all_code = "\n\n".join(code_blocks)
        
        # Prepare prompt for test support
        prompt = f"""You are an AI test support assistant. Please help create a comprehensive testing strategy for the following code.

Code to Test:
```{all_code}
```

Test Input Context: {test_input_content if test_input_content else "No specific test input provided"}

User Question: {request.question if request.question else "Please provide a comprehensive testing strategy for this code"}

Please provide:
1. Test Strategy: Comprehensive approach to testing this code
2. Cross-Platform Testing: Considerations for different platforms/environments
3. Test Cases: Specific test scenarios to consider
4. Edge Cases: Potential edge cases to test
5. Tools and Frameworks: Recommended testing tools
6. Best Practices: Testing best practices for this type of code

Format your response clearly and provide actionable testing guidance."""

        # Get response from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Generate sensitivity analysis
        sensitivity_prompt = f"""Based on the code and testing strategy below, provide a sensitivity analysis:

Code: {all_code[:1000]}  # First 1000 chars
Testing Strategy: {response.text[:1000]}  # First 1000 chars

Please analyze:
1. What are the most critical areas that need testing?
2. What are the potential failure points?
3. What would be the impact of failures in different areas?
4. How sensitive is this code to different types of inputs?
5. What are the high-risk scenarios?

Provide a concise sensitivity analysis."""

        sensitivity_response = model.generate_content(sensitivity_prompt)
        
        return {
            "test_strategy": response.text,
            "cross_platform_testing": response.text,  # Could be extracted separately
            "sensitivity_analysis": sensitivity_response.text,
            "ai_response": response.text if request.question else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/images/{space_key}/{page_title}")
async def get_images(space_key: Optional[str] = None, page_title: str = ""):
    try:
        confluence = init_confluence()
        space_key = auto_detect_space(confluence, space_key)
        
        # Get content from the specified page
        page = confluence.get_page_by_title(space_key, page_title)
        if not page:
            raise HTTPException(status_code=404, detail=f"Page '{page_title}' not found")
        
        content = page['body']['storage']['value']
        
        # Extract image URLs from content
        image_urls = []
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find images in <img> tags
        for img in soup.find_all('img'):
            src = img.get('src')
            if src:
                image_urls.append(src)
        
        # Find images in attachments
        try:
            attachments = confluence.get_attachments_from_content(page['id'])
            for attachment in attachments:
                if any(ext in attachment['title'].lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg']):
                    image_urls.append(attachment['_links']['download'])
        except Exception as e:
            print(f"Warning: Could not fetch attachments: {e}")
        
        return {"images": image_urls}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/image-summary")
async def image_summary(request: ImageRequest, req: Request):
    try:
        # Use Gemini Vision for image analysis
        model = genai.GenerativeModel('gemini-pro-vision')
        
        # Download the image
        response = requests.get(request.image_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Could not download image")
        
        image_data = response.content
        
        # Prepare prompt for image analysis
        prompt = f"""Please analyze this image and provide a comprehensive summary.

Context: This image is from a Confluence page titled "{request.page_title}"

Please provide:
1. A detailed description of what you see in the image
2. Key elements and their significance
3. Any text or data visible in the image
4. The overall purpose or context of this image
5. Any insights or observations that might be relevant

Please be thorough and descriptive in your analysis."""

        # Get response from Gemini Vision
        image = {"mime_type": "image/jpeg", "data": image_data}
        response = model.generate_content([prompt, image])
        
        return {
            "summary": response.text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/image-qa")
async def image_qa(request: ImageSummaryRequest, req: Request):
    try:
        # Use Gemini Vision for image Q&A
        model = genai.GenerativeModel('gemini-pro-vision')
        
        # Download the image
        response = requests.get(request.image_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Could not download image")
        
        image_data = response.content
        
        # Prepare prompt for image Q&A
        prompt = f"""Based on this image and the provided summary, please answer the user's question.

Image Summary: {request.summary}
User Question: {request.question}

Please provide a detailed and accurate answer based on what you can see in the image and the context provided."""

        # Get response from Gemini Vision
        image = {"mime_type": "image/jpeg", "data": image_data}
        response = model.generate_content([prompt, image])
        
        return {
            "answer": response.text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/create-chart")
async def create_chart(request: ChartRequest, req: Request):
    try:
        # Use Gemini Vision to analyze the image and extract data
        model = genai.GenerativeModel('gemini-pro-vision')
        
        # Download the image
        response = requests.get(request.image_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Could not download image")
        
        image_data = response.content
        
        # Prepare prompt for chart creation
        prompt = f"""Please analyze this image and extract data to create a {request.chart_type} chart.

Chart Type: {request.chart_type}
Filename: {request.filename}

Please:
1. Extract all relevant data from the image
2. Organize the data in a structured format
3. Provide the data in a format suitable for creating a {request.chart_type} chart
4. Include any necessary metadata or labels

Please provide the data in a clear, structured format that can be used to recreate the chart."""

        # Get response from Gemini Vision
        image = {"mime_type": "image/jpeg", "data": image_data}
        response = model.generate_content([prompt, image])
        
        # Clean and structure the data
        def clean_ai_csv(raw_text):
            # Extract CSV-like data from AI response
            lines = raw_text.split('\n')
            csv_lines = []
            for line in lines:
                line = line.strip()
                if line and (',' in line or '\t' in line):
                    # Clean up the line
                    line = line.replace('|', ',').replace('\t', ',')
                    # Remove extra spaces around commas
                    line = re.sub(r'\s*,\s*', ',', line)
                    csv_lines.append(line)
            
            if csv_lines:
                return '\n'.join(csv_lines)
            else:
                # Fallback: create simple structured data
                return "Category,Value\nData,1"
        
        chart_data = clean_ai_csv(response.text)
        
        # Determine MIME type based on format
        mime_types = {
            'csv': 'text/csv',
            'json': 'application/json',
            'txt': 'text/plain',
            'html': 'text/html'
        }
        mime_type = mime_types.get(request.format, 'text/plain')
        
        return {
            "chart_data": chart_data,
            "mime_type": mime_type,
            "filename": request.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/export")
async def export_content(request: ExportRequest, req: Request):
    try:
        content = request.content
        format_type = request.format.lower()
        filename = request.filename
        
        # Create file based on format
        if format_type == 'pdf':
            file_buffer = create_pdf(content)
            mime_type = 'application/pdf'
        elif format_type == 'docx':
            file_buffer = create_docx(content)
            mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif format_type == 'csv':
            file_buffer = create_csv(content)
            mime_type = 'text/csv'
        elif format_type == 'json':
            file_buffer = create_json(content)
            mime_type = 'application/json'
        elif format_type == 'html':
            file_buffer = create_html(content)
            mime_type = 'text/html'
        elif format_type == 'txt':
            file_buffer = create_txt(content)
            mime_type = 'text/plain'
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format_type}")
        
        # Encode file content
        file_buffer.seek(0)
        file_content = file_buffer.read()
        
        if format_type in ['pdf', 'docx']:
            # Binary files need base64 encoding
            encoded_content = base64.b64encode(file_content).decode('utf-8')
        else:
            # Text files can be encoded directly
            encoded_content = file_content.decode('utf-8')
        
        return {
            "file": encoded_content,
            "mime": mime_type,
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-to-confluence")
async def save_to_confluence(request: SaveToConfluenceRequest, req: Request):
    try:
        confluence = init_confluence()
        space_key = auto_detect_space(confluence, request.space_key)
        
        # Create or update the page
        try:
            # Try to get existing page
            existing_page = confluence.get_page_by_title(space_key, request.page_title)
            if existing_page:
                # Update existing page
                confluence.update_page(
                    page_id=existing_page['id'],
                    title=request.page_title,
                    body=request.content,
                    type='page'
                )
                message = f"Page '{request.page_title}' updated successfully"
            else:
                # Create new page
                confluence.create_page(
                    space=space_key,
                    title=request.page_title,
                    body=request.content,
                    type='page'
                )
                message = f"Page '{request.page_title}' created successfully"
            
            return {
                "success": True,
                "message": message
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to save to Confluence: {str(e)}"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test")
async def test_endpoint():
    return {"message": "API is working correctly"}

def get_actual_api_key_from_identifier(identifier: str) -> str:
    # This function would map API key identifiers to actual keys
    # For now, return the identifier as-is
    return identifier 