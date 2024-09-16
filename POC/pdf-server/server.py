from flask import Flask, request, jsonify, send_file
from flask_cors import CORS  # Import CORS
import fitz  # PyMuPDF
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def extract_pdf_data(file_path):
    extracted_text = ""
    with fitz.open(file_path) as pdf:
        for page_num in range(pdf.page_count):
            page = pdf[page_num]
            extracted_text += page.get_text("text")  # Extract text from page
            extracted_text += "\n\n"  # Add spacing between pages
    return extracted_text

@app.route('/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)
    
    # Extract data from PDF
    extracted_text = extract_pdf_data(file_path)
    
    # Save extracted text to a file
    output_file_path = os.path.join(UPLOAD_FOLDER, 'extracted_text.txt')
    with open(output_file_path, 'w', encoding='utf-8') as text_file:
        text_file.write(extracted_text)
    
    return send_file(output_file_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
