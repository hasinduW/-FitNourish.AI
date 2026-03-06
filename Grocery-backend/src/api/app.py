from flask import Flask
from flask_cors import CORS

from src.api.routes.health import bp as health_bp
from src.api.routes.products import bp as products_bp
from src.api.routes.snapshots import bp as snapshots_bp
from src.api.routes.category_products import bp as category_products_bp
from src.api.routes.prices import bp as prices_bp  # <-- must match file path
from src.api.routes.recommend import bp as recommend_bp
from src.api.routes.routes_ai import bp_ai

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(snapshots_bp)
    app.register_blueprint(category_products_bp)
    app.register_blueprint(prices_bp)
    app.register_blueprint(recommend_bp)
    app.register_blueprint(bp_ai)

    return app

if __name__ == "__main__":
    app = create_app()
    # ✅ 0.0.0.0 allows other devices in same Wi-Fi to access
    app.run(host="0.0.0.0", port=5000, debug=True)