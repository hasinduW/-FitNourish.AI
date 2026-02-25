def engineer_features_v3(df):
    """Apply feature engineering for the diet v3 model."""

    df['BP_Risk_Score'] = df['Blood_Pressure_mmHg'].apply(
        lambda x: 0 if x < 120 else 1 if x < 140 else 2 if x < 160 else 3
    )

    df['Glucose_Risk_Score'] = df['Glucose_mg/dL'].apply(
        lambda x: 0 if x < 100 else 1 if x < 126 else 2 if x < 180 else 3
    )

    df['Cholesterol_Risk_Score'] = df['Cholesterol_mg/dL'].apply(
        lambda x: 0 if x < 200 else 1 if x < 240 else 2
    )

    df['BMI_Risk_Score'] = df['BMI'].apply(
        lambda x: 0 if x < 18.5 else 1 if x < 25 else 2 if x < 30 else 3
    )

    df['Overall_Health_Score'] = (
        df['BP_Risk_Score'] +
        df['Glucose_Risk_Score'] +
        df['Cholesterol_Risk_Score'] +
        df['BMI_Risk_Score']
    ) / 4

    severity_map = {'Mild': 1, 'Moderate': 2, 'Severe': 3}
    df['Severity_Numeric'] = df['Severity'].map(severity_map).fillna(0)

    activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2}
    df['Activity_Numeric'] = df['Physical_Activity_Level'].map(activity_map).fillna(1)

    df['Disease_Severity_Combo'] = df['Disease_Type'] + '_' + df['Severity']

    df['Has_Metabolic_Syndrome'] = (
        (df['BMI'] > 30) &
        (df['Blood_Pressure_mmHg'] > 130) &
        (df['Glucose_mg/dL'] > 100)
    ).astype(int)

    df['Lifestyle_Score'] = (
        (df['Weekly_Exercise_Hours'] / 10) * 0.4 +
        (df['Adherence_to_Diet_Plan'] / 100) * 0.3 +
        (df['Activity_Numeric'] / 2) * 0.3
    )

    df['Age_BMI_Product'] = df['Age'] * df['BMI'] / 100

    df['Is_Diabetic'] = (df['Disease_Type'] == 'Diabetes').astype(int)
    df['Is_Hypertensive'] = (df['Disease_Type'] == 'Hypertension').astype(int)
    df['Is_Obese_Disease'] = (df['Disease_Type'] == 'Obesity').astype(int)

    return df