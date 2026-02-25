

# DIET INFORMATION
DIET_INFO = {
    'Low_Carb': {
        'name': 'Low-Carb Diet',
        'description': 'Controls blood sugar and promotes weight loss',
        'principles': ['Limit carbs to 50-150g per day', 'Focus on proteins and healthy fats', 
                      'Avoid sugar, bread, pasta, rice', 'Eat vegetables, meat, fish, eggs, nuts'],
        'benefits': ['Better blood sugar control', 'Reduced insulin resistance', 'Weight loss', 'Lower triglycerides']
    },
    'Low_Sodium': {
        'name': 'Low-Sodium Diet',
        'description': 'Reduces blood pressure and cardiovascular strain',
        'principles': ['Limit sodium to under 2,000mg per day', 'Avoid processed foods', 
                      'No added salt', 'Read nutrition labels carefully'],
        'benefits': ['Lower blood pressure', 'Reduced heart disease risk', 'Less fluid retention', 'Better kidney function']
    },
    'Balanced': {
        'name': 'Balanced Diet',
        'description': 'Maintains overall health and wellness',
        'principles': ['Eat variety from all food groups', 'Control portion sizes', 
                      'Include fruits, vegetables, whole grains', 'Moderate protein and dairy'],
        'benefits': ['Sustainable long-term', 'Nutrient-rich', 'Supports healthy weight', 'Flexible and easy to follow']
    },
    'Mediterranean': {
        'name': 'Mediterranean Diet',
        'description': 'Promotes heart health and longevity',
        'principles': ['Olive oil as primary fat', 'Lots of fruits, vegetables, legumes', 
                      'Fish twice per week', 'Moderate wine (optional)'],
        'benefits': ['Excellent heart health', 'Anti-inflammatory', 'Brain health support', 'Rich in antioxidants']
    }
}

# RISK EXPLANATIONS
RISK_EXPLANATIONS = {
    'High': {
        'level': 'HIGH RISK',
        'color': 'red',
        'icon': '🔴',
        'message': 'Your health indicators show significant risk factors that require immediate attention.',
        'actions': [
            'Schedule an appointment with your doctor immediately',
            'Start implementing dietary changes today',
            'Begin regular physical activity (consult doctor first)',
            'Monitor your health metrics daily',
            'Reduce stress and improve sleep quality'
        ],
        'urgency': 'URGENT - Take action within 1 week',
        'consequences': 'Without intervention, you face increased risk of serious health complications including heart disease, diabetes complications, and stroke.'
    },
    'Low': {
        'level': 'LOW RISK',
        'color': 'green',
        'icon': '🟢',
        'message': 'Your health indicators are generally good, but there\'s always room for improvement.',
        'actions': [
            'Maintain your current healthy habits',
            'Continue regular health check-ups',
            'Stay active and eat balanced meals',
            'Monitor your health trends monthly',
            'Focus on preventive care'
        ],
        'urgency': 'PREVENTIVE - Maintain good habits',
        'consequences': 'Keep up the good work! Your healthy lifestyle is protecting you from chronic diseases.'
    },
    'medium': {
        'level': 'MODERATE RISK',
        'color': 'orange',
        'icon': '🟡',
        'message': 'Some health indicators need attention to prevent future complications.',
        'actions': [
            'Consult with your doctor within 2-4 weeks',
            'Make gradual dietary improvements',
            'Increase physical activity gradually',
            'Monitor health metrics weekly',
            'Address any unhealthy habits'
        ],
        'urgency': 'IMPORTANT - Address within 1 month',
        'consequences': 'Early intervention now can prevent serious health issues in the future.'
    }
}