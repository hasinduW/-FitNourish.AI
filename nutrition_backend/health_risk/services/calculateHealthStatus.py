def get_bp_status(bp_string):
    """Parse blood pressure and return status"""
    try:
        if not bp_string or '/' not in str(bp_string):
            return 'Unknown'
        systolic = int(str(bp_string).split('/')[0])
        if systolic < 120:
            return 'Normal'
        elif systolic < 130:
            return 'Elevated'
        elif systolic < 140:
            return 'High Stage 1'
        else:
            return 'High Stage 2'
    except:
        return 'Unknown'


def get_glucose_status(glucose):
    """Return glucose status"""
    if glucose < 100:
        return 'Normal'
    elif glucose < 126:
        return 'Prediabetes'
    else:
        return 'Diabetes Range'


def get_cholesterol_status(cholesterol):
    """Return cholesterol status"""
    if cholesterol < 200:
        return 'Desirable'
    elif cholesterol < 240:
        return 'Borderline High'
    else:
        return 'High'