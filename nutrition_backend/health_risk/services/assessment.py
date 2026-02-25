from health_risk.core.genarateVitalAlert import generate_vital_alerts


def generate_overall_assessment(risk_result, diet_result, user_data):
    """Generate overall health summary from risk and diet results."""
    risk_level = risk_result['risk_level']
    diet = diet_result['recommended_diet']

    if risk_level == 'High':
        priority = 'URGENT'
        timeline = 'Start immediately - within 1 week'
    elif risk_level == 'Medium':
        priority = 'IMPORTANT'
        timeline = 'Begin within 2-4 weeks'
    else:
        priority = 'MAINTENANCE'
        timeline = 'Ongoing prevention'

    vital_alerts = generate_vital_alerts(user_data)

    if any(alert['level'] == 'HIGH' for alert in vital_alerts):
        priority = 'URGENT'
        timeline = 'Immediate medical attention recommended'

    return {
        'summary': (
            f"Based on your health profile, you have {risk_level.upper()} health risk. "
            f"We recommend following a {diet.replace('_', '-')} diet."
        ),
        'priority': priority,
        'timeline': timeline,
        'key_actions': [
            f"Follow {diet.replace('_', '-')} diet strictly",
            risk_result['risk_info']['actions'][0],
            risk_result['risk_info']['actions'][1],
            'Monitor your progress weekly',
        ],
        'critical_alerts': vital_alerts,
        'next_steps': {
            'immediate': 'Schedule doctor appointment and start diet plan',
            'week_1': 'Begin dietary changes and increase physical activity',
            'month_1': 'Review progress and adjust plan as needed',
            'ongoing': 'Maintain healthy habits and regular check-ups',
        },
    }