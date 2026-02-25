from health_risk.services.calculateNeutrition import calculate_daily


def map_inputs_for_diet_model(user_data):
    """Map unified input to diet model format."""
    bmi = user_data.get('bmi')
    if not bmi:
        weight = user_data['weight']
        height = user_data['height'] / 100
        bmi = round(weight / (height ** 2), 1)

    exercise_map = {'low': 'Sedentary', 'medium': 'Moderate', 'high': 'Active'}
    activity = exercise_map.get(user_data.get('exercise', 'medium'), 'Moderate')

    daily_value = calculate_daily(user_data)

    return {
        'Age': user_data.get('age', 0),
        'Gender': user_data.get('gender', 'Male'),
        'Weight_kg': user_data.get('weight', 0),
        'Height_cm': user_data.get('height', 0),
        'BMI': bmi,
        'Disease_Type': user_data.get('disease_type', 'None'),
        'Severity': user_data.get('severity', 'Mild'),
        'Physical_Activity_Level': activity,
        'Daily_Caloric_Intake': daily_value.get('daily_totals', {}).get('calories'),
        'Cholesterol_mg/dL': user_data.get('cholesterol', 180),
        'Blood_Pressure_mmHg': user_data.get('blood_pressure', 120),
        'Glucose_mg/dL': user_data.get('glucose', 100),
        'Dietary_Restrictions': user_data.get('dietary_restrictions', 'None'),
        'Allergies': user_data.get('allergies', 'None'),
        'Weekly_Exercise_Hours': user_data.get('exercise_hours', 3),
        'Adherence_to_Diet_Plan': user_data.get('adherence', 70),
    }


def map_inputs_for_risk_model(user_data):
    """Map unified input to risk model format."""
    bmi = user_data.get('bmi')
    if not bmi:
        weight = user_data['weight']
        height = user_data['height'] / 100
        bmi = round(weight / (height ** 2), 1)

    print("3333--user data--3333",user_data)
    daily_value = calculate_daily(user_data)

    return {
        'age': user_data.get('age', 0),
        'weight': user_data.get('weight', 0),
        'height': user_data.get('height', 0),
        'exercise': user_data.get('exercise', 'medium'),
        'sleep': user_data.get('sleep', 7.0),
        'sugar_intake': daily_value.get('sugar_level'),
        'smoking': user_data.get('smoking', 'no'),
        'alcohol': user_data.get('alcohol', 'no'),
        'married': user_data.get('married', 'no'),
        'profession': user_data.get('profession', 'other'),
        'bmi': bmi,
        'Cholesterol_mg/dL': user_data.get('cholesterol', 180),
        'Blood_Pressure_mmHg': user_data.get('blood_pressure', 120),
        'Glucose_mg/dL': user_data.get('glucose', 90),
    }