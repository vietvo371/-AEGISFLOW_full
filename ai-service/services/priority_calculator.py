import datetime
from typing import List, Dict, Any, Optional

def classify_priority(score: float) -> str:
    """Classify priority level based on score (0-100)"""
    if score >= 80: return 'critical'
    elif score >= 60: return 'high'
    elif score >= 40: return 'medium'
    else: return 'low'

def calculate_rescue_priority(
    urgency: str,
    vulnerable_groups: List[str],
    people_count: int,
    water_level_m: Optional[float],
    created_at_iso: str,
    has_incident: bool = False
) -> Dict[str, Any]:
    """
    Calculate rescue request priority score (0-100) based on multiple factors.
    """
    score = 0
    
    # 1. Urgency level (Max 30)
    urgency_scores = {
        'critical': 30,
        'high': 20,
        'medium': 10,
        'low': 5
    }
    score += urgency_scores.get(urgency.lower(), 5)
    
    # 2. Vulnerable groups (Max 25)
    # Each group adds points, max 25
    vuln_points = len(vulnerable_groups) * 10
    score += min(25, vuln_points)
    
    # 3. People count (Max 15)
    if people_count >= 10:
        score += 15
    elif people_count >= 5:
        score += 10
    elif people_count >= 2:
        score += 5
        
    # 4. Water level (Max 15)
    if water_level_m is not None:
        if water_level_m >= 3.0:
            score += 15
        elif water_level_m >= 1.5:
            score += 10
        elif water_level_m >= 0.5:
            score += 5
            
    # 5. Waiting time (Max 10)
    try:
        # Expected format: ISO 8601 string, e.g., "2026-04-11T14:30:00Z"
        created_at = datetime.datetime.fromisoformat(created_at_iso.replace('Z', '+00:00'))
        now = datetime.datetime.now(datetime.timezone.utc)
        waiting_minutes = (now - created_at).total_seconds() / 60
        
        if waiting_minutes >= 120:
            score += 10
        elif waiting_minutes >= 60:
            score += 7
        elif waiting_minutes >= 30:
            score += 4
        elif waiting_minutes >= 15:
            score += 2
    except (ValueError, TypeError):
        pass # Ignore date parsing errors
        
    # 6. Associated incident (Max 5)
    if has_incident:
        score += 5
        
    final_score = min(100.0, float(score))
    
    return {
        'priority_score': final_score,
        'priority_level': classify_priority(final_score),
        'factors': {
            'urgency': urgency,
            'people_count': people_count,
            'vulnerable_count': len(vulnerable_groups),
            'water_level_m': water_level_m,
            'has_incident': has_incident
        }
    }
