#!/bin/bash
echo "Monitoring Gnome Routines DEBUG logs..."
echo "Filter: GR-DEBUG"
# Follow journalctl, grepping for our tag. 
journalctl -f -o cat | grep --line-buffered "GR-DEBUG"
