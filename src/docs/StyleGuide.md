# Mantine Component
## Group
- "noWrap" doesn't work anymore. Use wrap='nowrap' instead
- Use this property syntax if there are 2 or more properties that we are passing into the component opposed to all in one line:
< ~Component Name~ 
    <property>="md" 
    <property>="xs" 
    withBorder 
    style={{
        flexGrow: 0,
        width: '380px',
    }}
>
- if you want one component inside of a Group to be right-aligned, wrap it in a <divstyle={{marginLeft: 'auto'}}>
