from django import template

register = template.Library()

@register.filter(name='add_class')
def add_class(field, css_class):
    if hasattr(field, 'as_widget'):
        if field.errors:
            return field.as_widget(attrs={'class': f'{css_class} is-invalid'})
        elif field.value() in ['', None]:
            return field.as_widget(attrs={'class': f'{css_class}'})
        else:
            return field.as_widget(attrs={'class': f'{css_class} is-valid'})
    return field  # Devuelve el campo sin modificaciones si no tiene as_widget
