import os
import io
import base64
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from flask import Flask, render_template, request, jsonify
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# Initialize Flask App
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Global Storage (Simulated Session for Single User)
current_data = None
current_model = None
current_features = {'x': None, 'y': None}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    global current_data
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)

    try:
        if file.filename.endswith('.csv'):
            current_data = pd.read_csv(filepath)
        else:
            current_data = pd.read_excel(filepath)
            
        # Extract numeric columns only
        numeric_cols = current_data.select_dtypes(include=[np.number]).columns.tolist()
        return jsonify({'columns': numeric_cols, 'filename': file.filename})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/train', methods=['POST'])
def train_model():
    global current_model, current_features
    
    data_req = request.json
    x_col = data_req.get('x_column')
    y_col = data_req.get('y_column')

    if not current_data is not None:
         return jsonify({'error': 'No data uploaded'}), 400
         
    if x_col not in current_data.columns or y_col not in current_data.columns:
        return jsonify({'error': 'Invalid columns'}), 400

    # Prepare Data
    X = current_data[[x_col]].values
    y = current_data[y_col].values
    
    # Store feature names for prediction
    current_features['x'] = x_col
    current_features['y'] = y_col

    # Train Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train Model
    model = LinearRegression()
    model.fit(X_train, y_train)
    current_model = model

    # Evaluate
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    # Visualization with Matplotlib
    plt.figure(figsize=(10, 6))
    plt.style.use('dark_background')
    
    # Scatter plot of all data
    plt.scatter(X, y, color='#38bdf8', alpha=0.6, label='Actual Data')
    
    # Regression Line (Range Min to Max)
    x_range = np.linspace(X.min(), X.max(), 100).reshape(-1, 1)
    y_range_pred = model.predict(x_range)
    plt.plot(x_range, y_range_pred, color='#f43f5e', linewidth=2, linestyle='--', label='Regression Line')
    
    plt.xlabel(x_col)
    plt.ylabel(y_col)
    plt.title(f'Regression: {x_col} vs {y_col}')
    plt.legend()
    plt.grid(color='#334155', linestyle=':', linewidth=0.5)
    
    # Save plot to buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', transparent=True)
    buf.seek(0)
    plot_url = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close()

    return jsonify({
        'm': model.coef_[0],
        'c': model.intercept_,
        'mse': mse,
        'r2': r2,
        'plot_url': plot_url
    })

@app.route('/predict', methods=['POST'])
def predict():
    if not current_model:
        return jsonify({'error': 'Model not trained'}), 400
        
    try:
        val = float(request.json.get('value'))
        prediction = current_model.predict([[val]])[0]
        return jsonify({'prediction': prediction})
    except ValueError:
        return jsonify({'error': 'Invalid input value'}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
