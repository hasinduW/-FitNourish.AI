def generate_vital_alerts(user_data):
    alerts = []

    systolic = user_data.get('blood_pressure')

    
    if systolic >= 140 :
            alerts.append({
                'type': 'Blood Pressure',
                'level': 'HIGH',
                'icon': '🔴',
                'message': 'Your blood pressure is high and needs medical attention.',
                'action': 'Consult a doctor as soon as possible.'
        })
    elif systolic < 90:
            alerts.append({
                'type': 'Blood Pressure',
                'level': 'LOW',
                'icon': '🟡',
                'message': 'Your blood pressure is lower than normal.',
                'action': 'Monitor regularly and consult a doctor if symptoms appear.'
         })


    glucose = user_data.get('glucose')

    if glucose:
        if glucose >= 126:
            alerts.append({
                'type': 'Blood Glucose',
                'level': 'HIGH',
                'icon': '🔴',
                'message': 'High blood glucose detected (possible diabetes risk).',
                'action': 'Seek medical advice and consider dietary changes.'
            })
        elif glucose < 70:
            alerts.append({
                'type': 'Blood Glucose',
                'level': 'LOW',
                'icon': '🟡',
                'message': 'Low blood glucose detected.',
                'action': 'Consume fast-acting carbohydrates and monitor levels.'
            })

    
    cholesterol = user_data.get('cholesterol')

    if cholesterol:
        if cholesterol >= 240:
            alerts.append({
                'type': 'Cholesterol',
                'level': 'HIGH',
                'icon': '🔴',
                'message': 'High cholesterol level detected.',
                'action': 'Adopt a heart-healthy diet and consult a doctor.'
            })

    return alerts
